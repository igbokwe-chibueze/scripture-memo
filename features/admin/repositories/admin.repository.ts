import { Prisma } from "@/lib/generated/prisma/client";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type {
  AdminDashboardStats,
  AdminUserPage,
} from "@/features/admin/types/admin.types";

const ADMIN_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const;

type DashboardAggregateRow = {
  totalUsers: number;
  totalVerses: number;
  assignedWaypoints: number;
  totalBadges: number;
  recentlyActiveUsers: number;
};

/** Owns low-volume administration reads and fully audited account mutations. */
export const adminRepository = {
  /**
   * Loads every dashboard count in one database round trip.
   *
   * WHY: Five independent count calls would multiply hosted database operations
   * on every dashboard visit. This parameter-free aggregate keeps the same
   * authoritative result while making administration cheap and predictable.
   */
  async getDashboardStats(now: Date): Promise<AdminDashboardStats> {
    const activeSince = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000);
    const rows = await prisma.$queryRaw<DashboardAggregateRow[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::int FROM "user") AS "totalUsers",
        (SELECT COUNT(*)::int FROM "Verse") AS "totalVerses",
        (
          SELECT COUNT(*)::int
          FROM "Waypoint"
          WHERE "verseId" IS NOT NULL
        ) AS "assignedWaypoints",
        (SELECT COUNT(*)::int FROM "Badge") AS "totalBadges",
        (
          SELECT COUNT(*)::int
          FROM "UserProfile"
          WHERE "lastSeenAt" >= ${activeSince}
        ) AS "recentlyActiveUsers"
    `);

    return (
      rows[0] ?? {
        totalUsers: 0,
        totalVerses: 0,
        assignedWaypoints: 0,
        totalBadges: 0,
        recentlyActiveUsers: 0,
      }
    );
  },

  /** Returns one bounded, searchable account page without exposing credentials. */
  async findUsers({
    search,
    page,
    pageSize,
  }: {
    search?: string;
    page: number;
    pageSize: number;
  }): Promise<AdminUserPage> {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            {
              profile: {
                displayName: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {};

    const [items, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          suspendedAt: true,
          suspendReason: true,
          createdAt: true,
          profile: {
            select: {
              displayName: true,
              lastSeenAt: true,
              totalGlowPoints: true,
              totalWaypointsCompleted: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      total,
      items: items.map(({ profile, ...user }) => ({
        ...user,
        displayName: profile?.displayName ?? null,
        lastSeenAt: profile?.lastSeenAt ?? null,
        totalGlowPoints: profile?.totalGlowPoints ?? 0,
        totalWaypointsCompleted: profile?.totalWaypointsCompleted ?? 0,
      })),
    };
  },

  /**
   * Returns a tiny email-only suggestion set for explicit Super Admin lookup.
   * The minimum query length is enforced by the action before this method runs;
   * the hard result cap prevents exposing the complete account directory.
   */
  async findUserEmailSuggestions(query: string): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: query,
          mode: "insensitive",
        },
        suspendedAt: null,
      },
      orderBy: { email: "asc" },
      take: 6,
      select: { email: true },
    });

    return users.map((user) => user.email);
  },

  /**
   * Changes one account role and writes its audit row in the same transaction.
   *
   * The advisory lock prevents two Super Admins from simultaneously demoting
   * the final Super Admin after both observed another privileged account.
   */
  async changeUserRole({
    actorId,
    targetUserId,
    role,
    ipAddress,
  }: {
    actorId: string;
    targetUserId: string;
    role: UserRole;
    ipAddress: string | null;
  }): Promise<"updated" | "missing" | "last-super-admin"> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext('scripture-memo-admin-roles'))
      `;
      const target = await transaction.user.findUnique({
        where: { id: targetUserId },
        select: { role: true },
      });
      if (!target) return "missing";

      if (target.role === "SUPER_ADMIN" && role !== "SUPER_ADMIN") {
        const superAdminCount = await transaction.user.count({
          where: { role: "SUPER_ADMIN" },
        });
        if (superAdminCount <= 1) return "last-super-admin";
      }

      await transaction.user.update({
        where: { id: targetUserId },
        data: { role },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "USER_ROLE_CHANGED",
          entityType: "User",
          entityId: targetUserId,
          ipAddress,
          metadata: {
            previousRole: target.role,
            nextRole: role,
          },
        },
      });
      return "updated";
  }, ADMIN_TRANSACTION_OPTIONS);
  },

  /** Revokes every Better Auth session and records who performed the action. */
  async revokeUserSessions({
    actorId,
    targetUserId,
    ipAddress,
  }: {
    actorId: string;
    targetUserId: string;
    ipAddress: string | null;
  }): Promise<"revoked" | "missing"> {
    return prisma.$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });
      if (!target) return "missing";

      const result = await transaction.session.deleteMany({
        where: { userId: targetUserId },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "USER_SESSIONS_REVOKED",
          entityType: "User",
          entityId: targetUserId,
          ipAddress,
          metadata: { revokedSessionCount: result.count },
        },
      });
      return "revoked";
    }, ADMIN_TRANSACTION_OPTIONS);
  },

  /**
   * Removes sign-in capability and identifying account data without deleting
   * progression, rewards, fellowship history, or immutable audit records.
   *
   * WHY: Hard deletion is unsafe while many historical models reference User.
   * Anonymization satisfies the administrative removal intent without relying
   * on unreviewed cascading deletes or corrupting earned-history reconstruction.
   */
  async anonymizeUserAccount({
    actorId,
    targetUserId,
    ipAddress,
  }: {
    actorId: string;
    targetUserId: string;
    ipAddress: string | null;
  }): Promise<"anonymized" | "missing" | "last-super-admin" | "already-anonymized"> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext('scripture-memo-admin-account-removal'))
      `;
      const target = await transaction.user.findUnique({
        where: { id: targetUserId },
        select: {
          email: true,
          role: true,
          suspendReason: true,
        },
      });
      if (!target) return "missing";
      if (target.suspendReason === "ACCOUNT_ANONYMIZED") {
        return "already-anonymized";
      }

      if (target.role === "SUPER_ADMIN") {
        const activeSuperAdmins = await transaction.user.count({
          where: {
            role: "SUPER_ADMIN",
            suspendedAt: null,
          },
        });
        if (activeSuperAdmins <= 1) return "last-super-admin";
      }

      const anonymizedEmail = `deleted-${targetUserId}@deleted.scripture-memo.invalid`;
      const anonymizedAt = new Date();

      // Credentials and live sessions are removed before the identity fields are
      // replaced, ensuring the old email can never authenticate after commit.
      await transaction.session.deleteMany({ where: { userId: targetUserId } });
      await transaction.account.deleteMany({ where: { userId: targetUserId } });
      await transaction.verification.deleteMany({
        where: { identifier: target.email },
      });

      // Private notes and favorites are personal content rather than immutable
      // curriculum history, so account removal clears them instead of retaining
      // user-authored material under an anonymous identity.
      await transaction.userVerseNote.deleteMany({
        where: { userId: targetUserId },
      });
      await transaction.userFavoriteVerse.deleteMany({
        where: { userId: targetUserId },
      });

      await transaction.user.update({
        where: { id: targetUserId },
        data: {
          name: "Deleted player",
          email: anonymizedEmail,
          emailVerified: false,
          image: null,
          role: "USER",
          suspendedAt: anonymizedAt,
          suspendReason: "ACCOUNT_ANONYMIZED",
          suspendedUntil: null,
          profile: {
            upsert: {
              create: {
                displayName: "Deleted player",
                avatarKey: "lion",
                avatarFrameKey: "default",
              },
              update: {
                displayName: "Deleted player",
                countryCode: null,
                avatarKey: "lion",
                avatarFrameKey: "default",
                isPartner: false,
                lastSeenAt: null,
              },
            },
          },
        },
      });

      await transaction.auditLog.create({
        data: {
          actorId,
          action: "USER_ACCOUNT_ANONYMIZED",
          entityType: "User",
          entityId: targetUserId,
          ipAddress,
          metadata: {
            previousRole: target.role,
            preservedHistoricalProgress: true,
          },
        },
      });
      return "anonymized";
    }, ADMIN_TRANSACTION_OPTIONS);
  },

  /** Suspends or restores an account and revokes its Better Auth sessions. */
  async setUserSuspension({
    actorId,
    targetUserId,
    suspended,
    reason,
    ipAddress,
  }: {
    actorId: string;
    targetUserId: string;
    suspended: boolean;
    reason: string | null;
    ipAddress: string | null;
  }): Promise<"updated" | "missing" | "last-super-admin"> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext('scripture-memo-admin-suspension'))
      `;
      const target = await transaction.user.findUnique({
        where: { id: targetUserId },
        select: { role: true, suspendedAt: true },
      });
      if (!target) return "missing";

      if (suspended && target.role === "SUPER_ADMIN") {
        const activeSuperAdmins = await transaction.user.count({
          where: {
            role: "SUPER_ADMIN",
            suspendedAt: null,
          },
        });
        if (activeSuperAdmins <= 1) return "last-super-admin";
      }

      const suspendedAt = suspended ? new Date() : null;
      await transaction.user.update({
        where: { id: targetUserId },
        data: {
          suspendedAt,
          suspendReason: suspended ? reason : null,
          suspendedUntil: null,
        },
      });

      // WHY: Better Auth sessions are the authority for authenticated access.
      // Revoking every session makes suspension effective across all devices;
      // restoration never fabricates a new session for the account.
      if (suspended) {
        await transaction.session.deleteMany({
          where: { userId: targetUserId },
        });
      }

      await transaction.auditLog.create({
        data: {
          actorId,
          action: suspended ? "USER_SUSPENDED" : "USER_RESTORED",
          entityType: "User",
          entityId: targetUserId,
          ipAddress,
          metadata: {
            reason: suspended ? reason : null,
            previouslySuspended: target.suspendedAt !== null,
          },
        },
      });
      return "updated";
    }, ADMIN_TRANSACTION_OPTIONS);
  },
} as const;
