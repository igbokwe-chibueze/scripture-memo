/** Read-only public-field allowlists and atomic, case-insensitive handle claims. */
import { prisma } from "@/lib/prisma";
import { PlayerSocialConflictError } from "@/lib/errors/player-social-error";
import { Prisma } from "@/lib/generated/prisma/client";
import { playerSummarySelect, relationshipState, visiblePlayerWhere } from "@/features/friends/repositories/friend.repository";
import { USERNAME_CHANGE_INTERVAL_MS } from "../schemas/username.schema";
import type { PlayerProfileData } from "../types/player-profile.types";

/** The repository never returns a private auth ID, currency balance or contact data. */
export const playerProfileRepository = {
  /** Authorization stays inside the data access path as well as the view. */
  async getProfile(viewerId: string, publicId: string): Promise<PlayerProfileData | null> {
    const profile = await prisma.userProfile.findFirst({
      where: { publicId: publicId.toLowerCase(), user: visiblePlayerWhere(viewerId) },
      select: {
        ...playerSummarySelect,
        userId: true,
        countryCode: true,
        usernameChangedAt: true,
        beaconLevel: true,
        beaconXp: true,
        totalWaypointsCompleted: true,
        user: { select: {
          createdAt: true,
          streak: { select: { currentStreak: true, bestStreak: true } },
          badgeProgress: {
            where: { status: "COMPLETED", unlockedAt: { not: null } },
            orderBy: [{ unlockedAt: "desc" }, { id: "asc" }],
            take: 61,
            select: { badge: { select: { id: true, name: true, icon: true, rarity: true } } },
          },
        } },
      },
    });
    if (!profile) return null;
    const self = profile.userId === viewerId;
    const [lowUserId, highUserId] = [viewerId, profile.userId].sort();
    const edge = self ? null : await prisma.playerFriendship.findUnique({
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
      nextUsernameChangeAt: self && profile.usernameChangedAt
        && profile.usernameChangedAt.getTime() + USERNAME_CHANGE_INTERVAL_MS > Date.now()
        ? new Date(profile.usernameChangedAt.getTime() + USERNAME_CHANGE_INTERVAL_MS).toISOString()
        : null,
      badges: profile.user.badgeProgress.slice(0, 60).map((row) => row.badge),
      hasMoreBadges: profile.user.badgeProgress.length > 60,
    };
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
        if (profile.usernameChangedAt && now.getTime() - profile.usernameChangedAt.getTime() < USERNAME_CHANGE_INTERVAL_MS) {
          throw new PlayerSocialConflictError("usernameCooldown");
        }
        await tx.userProfile.update({
          where: { userId },
          data: { username, usernameChangedAt: now },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new PlayerSocialConflictError("usernameTaken");
      }
      throw error;
    }
  },
};
