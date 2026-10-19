/** Private social graph: all writes serialize participants in a stable order.
 * Ordinary profile/list/search reads never acquire locks, initialize state or poll.
 */
import { randomUUID } from "node:crypto";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PlayerSocialConflictError } from "@/lib/errors/player-social-error";
import type { FriendOperation, FriendsPageInput } from "../schemas/friend.schema";
import type { FriendsPageData, FriendState, PlayerSummary } from "@/types/player-social.types";
import { escapePlayerSearch } from "../lib/escape-player-search";

/** Only these account/profile fields may cross the browser boundary. */
export const playerSummarySelect = {
  publicId: true,
  displayName: true,
  username: true,
  avatarKey: true,
  avatarFrameKey: true,
} as const satisfies Prisma.UserProfileSelect;

/** Filter out suspended/banned accounts from discovery and social interactions. */
export const activePlayerWhere = { banned: false, suspendedAt: null } as const;

/** Locks each account in sorted order, covering pair races and outgoing quotas. */
async function lockParticipants(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
  for (const id of [...new Set(ids)].sort()) {
    // PostgreSQL returns void; text casting keeps local and hosted adapters aligned.
    await tx.$queryRaw`
      SELECT pg_advisory_xact_lock(hashtext('scripture-memo-player-social'), hashtext(${id}))::text
    `;
  }
}

/** Derives a viewer-relative state without sending internal account identifiers. */
export function relationshipState(
  viewerId: string,
  edge: { status: string; requesterId: string } | null,
): FriendState {
  if (!edge) return "none";
  if (edge.status === "ACCEPTED") return "friends";
  return edge.requesterId === viewerId ? "outgoing" : "incoming";
}

/** Hide a blocked pair in both directions, without revealing the blocker. */
export function visiblePlayerWhere(viewerId: string): Prisma.UserWhereInput {
  return {
    ...activePlayerWhere,
    blocksMade: { none: { blockedId: viewerId } },
    blocksReceived: { none: { blockerId: viewerId } },
  };
}

/** Owns the graph and bounded, owner-only list/search queries. */
export const friendRepository = {
  /** Resolve the owner's stable profile link without a write or identity repair. */
  async getOwnPublicId(userId: string): Promise<string | null> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { publicId: true },
    });
    return profile?.publicId ?? null;
  },

  /**
   * One explicit search submits at least two characters, returns up to 20 rows,
   * and uses exact @handle lookup or display-name/handle prefix matching. Empty
   * searches never enumerate the player directory. Other tabs are private to actor.
   */
  async getPage(userId: string, input: FriendsPageInput): Promise<FriendsPageData | null> {
    const ownPublicId = await this.getOwnPublicId(userId);
    if (!ownPublicId) return null;
    const base = { ownPublicId, players: [], hasNext: false };
    const take = 21;
    const skip = (input.page - 1) * 20;

    if (input.tab === "blocked") {
      const rows = await prisma.playerBlock.findMany({
        where: { blockerId: userId },
        orderBy: [{ createdAt: "desc" }, { blockedId: "asc" }],
        take,
        skip,
        select: { blocked: { select: { profile: { select: playerSummarySelect } } } },
      });
      return {
        ownPublicId,
        hasNext: rows.length > 20,
        players: rows.slice(0, 20).flatMap((row) => row.blocked.profile
          ? [{ ...row.blocked.profile, relationship: "blocked" as const }]
          : []),
      };
    }

    if (input.tab === "search") {
      const query = input.q.replace(/^@/, "").toLowerCase();
      if (query.length < 2) return base;
      const rows = await prisma.userProfile.findMany({
        where: {
          userId: { not: userId },
          user: visiblePlayerWhere(userId),
          ...(input.q.startsWith("@")
            ? { username: query }
            : { OR: [
                { username: { startsWith: escapePlayerSearch(query) } },
                { displayName: { startsWith: escapePlayerSearch(input.q), mode: "insensitive" } },
              ] }),
        },
        orderBy: [{ displayName: "asc" }, { publicId: "asc" }],
        take,
        skip,
        select: { ...playerSummarySelect, userId: true },
      });
      // One batched graph read resolves all visible search states, avoiding N+1.
      const targetIds = rows.map((row) => row.userId);
      const edges = targetIds.length ? await prisma.playerFriendship.findMany({
        where: { OR: [
          { lowUserId: userId, highUserId: { in: targetIds } },
          { highUserId: userId, lowUserId: { in: targetIds } },
        ] },
        select: { lowUserId: true, highUserId: true, status: true, requesterId: true },
      }) : [];
      return {
        ownPublicId,
        hasNext: rows.length > 20,
        players: rows.slice(0, 20).map(({ userId: targetId, ...summary }) => ({
          ...summary,
          relationship: relationshipState(userId, edges.find((edge) =>
            edge.lowUserId === targetId || edge.highUserId === targetId) ?? null),
        })),
      };
    }

    const status = input.tab === "friends" ? "ACCEPTED" : "PENDING";
    const rows = await prisma.playerFriendship.findMany({
      where: {
        status,
        ...(input.tab === "requests" ? { requesterId: { not: userId } } : {}),
        ...(input.tab === "sent" ? { requesterId: userId } : {}),
        OR: [
          { lowUserId: userId, highUser: visiblePlayerWhere(userId) },
          { highUserId: userId, lowUser: visiblePlayerWhere(userId) },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { lowUserId: "asc" }, { highUserId: "asc" }],
      take,
      skip,
      select: {
        lowUserId: true,
        requesterId: true,
        status: true,
        lowUser: { select: { profile: { select: playerSummarySelect } } },
        highUser: { select: { profile: { select: playerSummarySelect } } },
      },
    });
    return {
      ownPublicId,
      hasNext: rows.length > 20,
      players: rows.slice(0, 20).flatMap((row) => {
        const profile = row.lowUserId === userId ? row.highUser.profile : row.lowUser.profile;
        return profile ? [{ ...profile, relationship: relationshipState(userId, row) }] : [];
      }),
    };
  },

  /**
   * Enforce actor ownership, explicit recipient acceptance and blocking atomically.
   * Crossing requests never silently accept: only the incoming recipient can accept.
   * At most 30 newly created requests per actor per hour, shared across instances;
   * repeated pending requests are idempotent and cannot amplify notifications.
   */
  async mutate(userId: string, publicId: string, operation: FriendOperation): Promise<void> {
    const target = await prisma.userProfile.findUnique({
      where: { publicId: publicId.toLowerCase() },
      select: { userId: true, publicId: true },
    });
    if (!target || target.userId === userId) throw new PlayerSocialConflictError("unavailable");
    const targetId = target.userId;
    const [lowUserId, highUserId] = [userId, targetId].sort();
    const pair = { lowUserId, highUserId };

    await prisma.$transaction(async (tx) => {
      await lockParticipants(tx, [userId, targetId]);
      const [accounts, blocks, edge] = await Promise.all([
        tx.user.count({ where: { id: { in: [userId, targetId] }, ...activePlayerWhere } }),
        tx.playerBlock.findMany({
          where: { OR: [
            { blockerId: userId, blockedId: targetId },
            { blockerId: targetId, blockedId: userId },
          ] },
          select: { blockerId: true },
        }),
        tx.playerFriendship.findUnique({ where: { lowUserId_highUserId: pair } }),
      ]);
      if (operation === "unblock") {
        // A blocked account may later be suspended; its owner can still remove
        // their own block without restoring any friendship or exposing a profile.
        const actor = await tx.user.count({ where: { id: userId, ...activePlayerWhere } });
        if (actor !== 1) throw new PlayerSocialConflictError("unavailable");
        await tx.playerBlock.deleteMany({ where: { blockerId: userId, blockedId: targetId } });
        return;
      }
      if (accounts !== 2) throw new PlayerSocialConflictError("unavailable");
      if (operation === "block") {
        await tx.playerFriendship.deleteMany({ where: pair });
        await tx.playerBlock.upsert({
          where: { blockerId_blockedId: { blockerId: userId, blockedId: targetId } },
          create: { blockerId: userId, blockedId: targetId },
          update: {},
        });
        // Remove both participants' old friend notices so blocked identities
        // cannot linger as clickable social notices. Never notify about a block.
        const actorProfile = await tx.userProfile.findUniqueOrThrow({
          where: { userId },
          select: { publicId: true },
        });
        await tx.userNotification.deleteMany({
          where: {
            type: { in: ["FRIEND_REQUEST", "FRIEND_ACCEPTED"] },
            OR: [
              { userId, payload: { path: ["playerPublicId"], equals: target.publicId } },
              {
                userId: targetId,
                payload: { path: ["playerPublicId"], equals: actorProfile.publicId },
              },
            ],
          },
        });
        return;
      }
      if (blocks.length) throw new PlayerSocialConflictError("unavailable");

      if (operation === "request") {
        if (edge?.status === "ACCEPTED" || edge?.requesterId === userId) return;
        if (edge) throw new PlayerSocialConflictError("invalidTransition");
        const now = new Date();
        const key = `player-friend-requests:${userId}`;
        const budget = await tx.rateLimit.findUnique({ where: { key } });
        const expired = !budget || now.getTime() - Number(budget.lastRequest) >= 3_600_000;
        if (!expired && budget.count >= 30) throw new PlayerSocialConflictError("rateLimited");
        await tx.rateLimit.upsert({
          where: { key },
          create: { key, count: 1, lastRequest: BigInt(now.getTime()) },
          update: { count: expired ? 1 : { increment: 1 }, ...(expired ? { lastRequest: BigInt(now.getTime()) } : {}) },
        });
        await tx.playerFriendship.create({ data: { ...pair, requesterId: userId } });
        await createFriendNotice(tx, userId, targetId, "FRIEND_REQUEST");
        return;
      }

      if (operation === "accept") {
        if (edge?.status === "ACCEPTED") return;
        if (!edge || edge.requesterId === userId) throw new PlayerSocialConflictError("invalidTransition");
        await tx.playerFriendship.update({
          where: { lowUserId_highUserId: pair },
          data: { status: "ACCEPTED", acceptedAt: new Date() },
        });
        await createFriendNotice(tx, userId, targetId, "FRIEND_ACCEPTED");
        return;
      }

      if (!edge) return;
      const permitted = (operation === "decline" && edge.status === "PENDING" && edge.requesterId !== userId)
        || (operation === "cancel" && edge.status === "PENDING" && edge.requesterId === userId)
        || (operation === "unfriend" && edge.status === "ACCEPTED");
      if (!permitted) throw new PlayerSocialConflictError("invalidTransition");
      await tx.playerFriendship.delete({ where: { lowUserId_highUserId: pair } });
    }, { maxWait: 10_000, timeout: 20_000 });
  },
};

/** Transactional notices contain only a stable public profile link and display name. */
async function createFriendNotice(
  tx: Prisma.TransactionClient,
  actorId: string,
  recipientId: string,
  type: "FRIEND_REQUEST" | "FRIEND_ACCEPTED",
): Promise<void> {
  const actor: PlayerSummary = await tx.userProfile.findUniqueOrThrow({
    where: { userId: actorId },
    select: playerSummarySelect,
  });
  await tx.userNotification.create({
    data: {
      userId: recipientId,
      type,
      dedupeKey: `friend:${randomUUID()}`,
      payload: { playerPublicId: actor.publicId, playerDisplayName: actor.displayName },
    },
  });
}
