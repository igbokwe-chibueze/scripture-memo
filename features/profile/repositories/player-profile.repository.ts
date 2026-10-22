/** Read-only public-field allowlists and atomic, case-insensitive handle claims. */
import { prisma } from "@/lib/prisma";
import { PlayerSocialConflictError } from "@/lib/errors/player-social-error";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  playerSummarySelect,
  relationshipState,
  visiblePlayerWhere,
} from "@/features/friends/repositories/friend.repository";
import { USERNAME_CHANGE_INTERVAL_MS } from "../schemas/username.schema";
import type { PlayerProfileData } from "../types/player-profile.types";
import type { EditProfileInput } from "../schemas/edit-profile.schema";
import { FREE_AVATAR_KEYS, isFreeAvatar } from "../data/avatar-catalog";

/** The repository never returns a private auth ID, currency balance or contact data. */
export const playerProfileRepository = {
  /** Authorization stays inside the data access path as well as the view. */
  async getProfile(
    viewerId: string,
    publicId: string,
  ): Promise<PlayerProfileData | null> {
    const profile = await prisma.userProfile.findFirst({
      where: {
        publicId: publicId.toLowerCase(),
        user: visiblePlayerWhere(viewerId),
      },
      select: {
        ...playerSummarySelect,
        userId: true,
        countryCode: true,
        usernameChangedAt: true,
        beaconLevel: true,
        beaconXp: true,
        totalWaypointsCompleted: true,
        user: {
          select: {
            createdAt: true,
            streak: { select: { currentStreak: true, bestStreak: true } },
            badgeProgress: {
              where: { status: "COMPLETED", unlockedAt: { not: null } },
              orderBy: [{ unlockedAt: "desc" }, { id: "asc" }],
              take: 61,
              select: {
                badge: {
                  select: { id: true, name: true, icon: true, rarity: true },
                },
              },
            },
          },
        },
      },
    });
    if (!profile) return null;
    const self = profile.userId === viewerId;
    // Public mastery is curriculum progress; social/inventory counts are queried
    // only for the owner. No private history rows leave this repository.
    const [summary] = await prisma.$queryRaw<
      {
        mastered: number;
        friends: number;
        fellowships: number;
        hints: number;
      }[]
    >`
      SELECT
        (SELECT COUNT(*)::int FROM (
          SELECT w."verseId" FROM "UserWaypointProgress" p
          JOIN "Waypoint" w ON w.id = p."waypointId"
          WHERE p."userId" = ${profile.userId} AND p.status = 'COMPLETED'
          GROUP BY w."verseId" HAVING COUNT(DISTINCT w."journeyStage") = 4
        ) mastered) AS mastered,
        CASE WHEN ${self} THEN (SELECT COUNT(*)::int FROM "PlayerFriendship" f
          JOIN "user" u ON u.id = CASE WHEN f."lowUserId" = ${viewerId} THEN f."highUserId" ELSE f."lowUserId" END
          WHERE f.status = 'ACCEPTED' AND (f."lowUserId" = ${viewerId} OR f."highUserId" = ${viewerId})
          AND NOT u.banned AND u."suspendedAt" IS NULL) ELSE 0 END AS friends,
        CASE WHEN ${self} THEN (SELECT COUNT(*)::int FROM "FellowshipMember" WHERE "userId" = ${viewerId}) ELSE 0 END AS fellowships,
        CASE WHEN ${self} THEN (SELECT COUNT(*)::int FROM "HintUsage" h
          JOIN "GameSession" s ON s.id = h."gameSessionId"
          WHERE h."userId" = ${viewerId} AND s."userId" = ${viewerId} AND NOT s."isAdminTest") ELSE 0 END AS hints
    `;
    const ownedAvatars = self
      ? await prisma.userAvatarOwnership.findMany({
          where: { userId: viewerId },
          select: { avatarKey: true },
        })
      : [];
    const [lowUserId, highUserId] = [viewerId, profile.userId].sort();
    const edge = self
      ? null
      : await prisma.playerFriendship.findUnique({
          where: { lowUserId_highUserId: { lowUserId, highUserId } },
          select: { requesterId: true, status: true },
        });
    return {
      publicId: profile.publicId,
      displayName: profile.displayName,
      username: profile.username,
      avatarKey: profile.avatarKey,
      avatarFrameKey: profile.avatarFrameKey,
      countryCode: profile.countryCode,
      relationship: self ? "self" : relationshipState(viewerId, edge),
      joinedAt: profile.user.createdAt.toISOString(),
      beaconLevel: profile.beaconLevel,
      lifetimeBeaconXp: profile.beaconXp,
      completedWaypoints: profile.totalWaypointsCompleted,
      currentStreak: profile.user.streak?.currentStreak ?? 0,
      bestStreak: profile.user.streak?.bestStreak ?? 0,
      masteredVerses: summary.mastered,
      privateDetails: self
        ? {
            friends: summary.friends,
            fellowships: summary.fellowships,
            hintsUsed: summary.hints,
            availableAvatars: [
              ...new Set([
                ...FREE_AVATAR_KEYS,
                ...ownedAvatars.map((row) => row.avatarKey),
              ]),
            ],
          }
        : null,
      nextUsernameChangeAt:
        self &&
        profile.usernameChangedAt &&
        profile.usernameChangedAt.getTime() + USERNAME_CHANGE_INTERVAL_MS >
          Date.now()
          ? new Date(
              profile.usernameChangedAt.getTime() + USERNAME_CHANGE_INTERVAL_MS,
            ).toISOString()
          : null,
      badges: profile.user.badgeProgress.slice(0, 60).map((row) => row.badge),
      hasMoreBadges: profile.user.badgeProgress.length > 60,
    };
  },

  /** Save identity and handle atomically so a rejected handle never partially saves a form. */
  async editProfile(userId: string, input: EditProfileInput): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Share the username mutation's lock; concurrent edits cannot bypass cooldowns.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-player-social'), hashtext(${userId}))::text`;
        const profile = await tx.userProfile.findFirst({
          where: { userId, user: { banned: false, suspendedAt: null } },
          select: { username: true, usernameChangedAt: true },
        });
        if (!profile) throw new PlayerSocialConflictError("unavailable");
        if (!isFreeAvatar(input.avatarKey)) {
          const owned = await tx.userAvatarOwnership.findUnique({
            where: { userId_avatarKey: { userId, avatarKey: input.avatarKey } },
            select: { avatarKey: true },
          });
          if (!owned) throw new PlayerSocialConflictError("unavailable");
        }
        const changedHandle =
          input.username !== undefined && input.username !== profile.username;
        const now = new Date();
        if (
          changedHandle &&
          profile.usernameChangedAt &&
          now.getTime() - profile.usernameChangedAt.getTime() <
            USERNAME_CHANGE_INTERVAL_MS
        ) {
          throw new PlayerSocialConflictError("usernameCooldown");
        }
        await tx.userProfile.update({
          where: { userId },
          data: {
            displayName: input.displayName,
            countryCode: input.countryCode || null,
            avatarKey: input.avatarKey,
            ...(changedHandle
              ? { username: input.username, usernameChangedAt: now }
              : {}),
          },
        });
        await tx.user.update({
          where: { id: userId },
          data: { name: input.displayName },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new PlayerSocialConflictError("usernameTaken");
      }
      throw error;
    }
  },

  /**
   * Lock the owner against concurrent edits; the unique index arbitrates claims
   * from different accounts. A no-op save never restarts the 30-day cooldown.
   * Null handles are intentional for existing/new players until explicitly chosen.
   */
  async updateUsername(userId: string, username: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Cast PostgreSQL's void return so every driver can decode the lock result.
        await tx.$queryRaw`
          SELECT pg_advisory_xact_lock(hashtext('scripture-memo-player-social'), hashtext(${userId}))::text
        `;
        const profile = await tx.userProfile.findFirst({
          where: { userId, user: { banned: false, suspendedAt: null } },
          select: { username: true, usernameChangedAt: true },
        });
        if (!profile) throw new PlayerSocialConflictError("unavailable");
        if (profile.username === username) return;
        const now = new Date();
        if (
          profile.usernameChangedAt &&
          now.getTime() - profile.usernameChangedAt.getTime() <
            USERNAME_CHANGE_INTERVAL_MS
        ) {
          throw new PlayerSocialConflictError("usernameCooldown");
        }
        await tx.userProfile.update({
          where: { userId },
          data: { username, usernameChangedAt: now },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new PlayerSocialConflictError("usernameTaken");
      }
      throw error;
    }
  },
};
