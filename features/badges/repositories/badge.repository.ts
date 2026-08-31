import {
  CompletionStatus,
  GameModeAttemptStatus,
  JourneyStage,
  Prisma,
  RewardEventType,
  UserNotificationType,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  BadgeCollectionItem,
  BadgeCriteriaKey,
  BadgeEvent,
  BadgeUnlockResult,
  AdminBadgeItem,
} from "@/features/badges/types/badge.types";
import type { BadgeCategory, BadgeRarity } from "@/lib/generated/prisma/enums";
import {
  ACTIVE_BADGE_CRITERIA_VALUES,
  BADGE_REWARD_BY_RARITY,
} from "@/features/badges/constants/badge-criteria";

export type SaveBadgeData = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  category: BadgeCategory;
  rarity: BadgeRarity;
  criteriaKey: BadgeCriteriaKey;
  targetValue: number;
  isHidden: boolean;
  isActive: boolean;
};

const badgeTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

/** Serializes badge progress and reward writes for one learner. */
async function lockUserBadges(
  transaction: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-badges'), hashtext(${userId}))`;
}

/** Derives all currently implemented day-level metrics from trusted history. */
async function getDayMetricValues(
  transaction: Prisma.TransactionClient,
  userId: string,
): Promise<Partial<Record<BadgeCriteriaKey, number>>> {
  const [completedWaypoints, completedSessions] = await Promise.all([
    transaction.userWaypointProgress.findMany({
      where: { userId, status: CompletionStatus.COMPLETED },
      select: {
        waypointId: true,
        waypoint: { select: { verseId: true, journeyStage: true } },
      },
    }),
    transaction.gameSession.findMany({
      where: {
        userId,
        status: CompletionStatus.COMPLETED,
        isVaultReplay: false,
        isAdminTest: false,
      },
      select: {
        waypointId: true,
        attempts: {
          select: { status: true, attemptNumber: true },
        },
        hintUsages: { select: { id: true } },
        waypoint: { select: { journeyStage: true } },
      },
    }),
  ]);

  const stagesByVerse = new Map<string, Set<JourneyStage>>();
  completedWaypoints.forEach(({ waypoint }) => {
    if (!waypoint.verseId) return;
    const stages = stagesByVerse.get(waypoint.verseId) ?? new Set<JourneyStage>();
    stages.add(waypoint.journeyStage);
    stagesByVerse.set(waypoint.verseId, stages);
  });
  const masteredVerses = [...stagesByVerse.values()].filter(
    (stages) => stages.size === 4,
  ).length;
  const perfectSessions = completedSessions.filter(
    ({ attempts }) =>
      attempts.length === 5 &&
      attempts.every(
        ({ status, attemptNumber }) =>
          status === GameModeAttemptStatus.COMPLETED && attemptNumber === 1,
      ),
  ).length;
  const waypointIdsWithAssistance = new Set(
    completedSessions
      .filter(({ hintUsages }) => hintUsages.length > 0)
      .flatMap(({ waypointId }) => (waypointId ? [waypointId] : [])),
  );
  const countStage = (stage: JourneyStage): number =>
    completedWaypoints.filter(
      ({ waypoint }) => waypoint.journeyStage === stage,
    ).length;
  const countHintFreeStage = (stage: JourneyStage): number =>
    completedWaypoints.filter(
      ({ waypointId, waypoint }) =>
        waypoint.journeyStage === stage &&
        !waypointIdsWithAssistance.has(waypointId),
    ).length;

  return {
    LEARN_STAGE_COMPLETED: countStage(JourneyStage.LEARN),
    MASTERED_VERSES: masteredVerses,
    PERFECT_SESSIONS: perfectSessions,
    VERSE_ALL_STAGES: masteredVerses,
    RECALL_WAYPOINTS: countStage(JourneyStage.RECALL),
    LEARN_HINT_FREE: countHintFreeStage(JourneyStage.LEARN),
    STRENGTHEN_HINT_FREE: countHintFreeStage(JourneyStage.STRENGTHEN),
    MASTER_HINT_FREE: countHintFreeStage(JourneyStage.MASTER),
    TIMED_STAGES:
      countStage(JourneyStage.RECALL) +
      countStage(JourneyStage.STRENGTHEN) +
      countStage(JourneyStage.MASTER),
  };
}

/** Maps one trusted event to absolute metric values, never client increments. */
async function getEventMetricValues(
  transaction: Prisma.TransactionClient,
  userId: string,
  event: BadgeEvent,
): Promise<Partial<Record<BadgeCriteriaKey, number>>> {
  if (event.type === "MODE_COMPLETED") {
    return { STREAK_DAYS: event.currentStreak };
  }
  if (event.type === "VAULT_REPLAY_COMPLETED") {
    return {
      VAULT_REPLAYS: await transaction.gameSession.count({
        where: {
          userId,
          isVaultReplay: true,
          status: CompletionStatus.COMPLETED,
        },
      }),
    };
  }
  if (event.type === "FELLOWSHIP_JOINED") {
    return { FELLOWSHIP_JOIN: await transaction.fellowshipMember.count({ where: { userId } }) };
  }
  if (event.type === "FELLOWSHIP_CREATED") {
    return { FELLOWSHIP_CREATE: await transaction.fellowship.count({ where: { createdById: userId } }) };
  }
  if (event.type === "LEADERBOARD_VIEWED") {
    // WHY: The rank came from the server-owned leaderboard repository. The
    // badge engine converts that trusted position into an absolute criterion
    // value rather than accepting a client claim that the learner reached 100.
    return { LEADERBOARD_TOP_100: event.globalRank <= 100 ? 1 : 0 };
  }
  return getDayMetricValues(transaction, userId);
}

/**
 * Evaluates active badges and atomically unlocks/rewards newly met criteria.
 *
 * WHY: Progress uses absolute server-derived totals. The unique user/badge row,
 * per-user advisory lock, and reward-ledger idempotency key jointly prevent a
 * retry or concurrent completion from awarding the same badge twice.
 */
export async function evaluateBadgeProgressInTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
  event: BadgeEvent,
  occurredAt: Date,
): Promise<BadgeUnlockResult[]> {
  await lockUserBadges(transaction, userId);
  const metrics = await getEventMetricValues(transaction, userId, event);
  const criteriaKeys = Object.keys(metrics);
  if (criteriaKeys.length === 0) return [];

  const badges = await transaction.badge.findMany({
    where: { isActive: true, criteriaKey: { in: criteriaKeys } },
    include: {
      userProgress: { where: { userId }, take: 1 },
    },
  });
  const unlocks: BadgeUnlockResult[] = [];

  for (const badge of badges) {
    const progress = Math.max(
      0,
      Math.min(metrics[badge.criteriaKey as BadgeCriteriaKey] ?? 0, badge.targetValue),
    );
    const existing = badge.userProgress[0];
    if (existing?.status === CompletionStatus.COMPLETED) continue;
    const unlocked = progress >= badge.targetValue;
    await transaction.userBadgeProgress.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: {
        progress,
        status: unlocked ? CompletionStatus.COMPLETED : CompletionStatus.IN_PROGRESS,
        ...(unlocked ? { unlockedAt: occurredAt } : {}),
      },
      create: {
        userId,
        badgeId: badge.id,
        progress,
        status: unlocked ? CompletionStatus.COMPLETED : CompletionStatus.IN_PROGRESS,
        unlockedAt: unlocked ? occurredAt : null,
      },
    });
    if (!unlocked) continue;

    if (badge.rewardAmount > 0) {
      await transaction.rewardLedger.create({
        data: {
          userId,
          amount: badge.rewardAmount,
          eventType: RewardEventType.BADGE_UNLOCK,
          reason: `Badge unlocked: ${badge.name}`,
          idempotencyKey: `badge-unlock:${userId}:${badge.id}`,
        },
      });
    }
    const profile = await transaction.userProfile.update({
      where: { userId },
      data: { totalGlowPoints: { increment: badge.rewardAmount } },
      select: { totalGlowPoints: true },
    });
    unlocks.push({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      rarity: badge.rarity,
      rewardAmount: badge.rewardAmount,
      balance: profile.totalGlowPoints,
    });
  }
  return unlocks;
}

/** Database boundary for badge reads, evaluation, and administration. */
export const badgeRepository = {
  async findAll(): Promise<BadgeCollectionItem[]> {
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { targetValue: "asc" }],
    });
    return badges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      slug: badge.slug,
      description: badge.description,
      icon: badge.icon,
      category: badge.category,
      rarity: badge.rarity,
      targetValue: badge.targetValue,
      rewardAmount: badge.rewardAmount,
      isHidden: badge.isHidden,
      isActive: badge.isActive,
      progress: 0,
      status: CompletionStatus.NOT_STARTED,
      unlockedAt: null,
    }));
  },

  async getUserBadgeProgress(userId: string): Promise<BadgeCollectionItem[]> {
    const badges = await prisma.badge.findMany({
      where: {
        OR: [
          { isActive: true },
          {
            userProgress: {
              some: { userId, status: CompletionStatus.COMPLETED },
            },
          },
        ],
      },
      include: { userProgress: { where: { userId }, take: 1 } },
      orderBy: [{ category: "asc" }, { targetValue: "asc" }],
    });
    return badges.map(({ userProgress, ...badge }) => {
      const status =
        userProgress[0]?.status ?? CompletionStatus.NOT_STARTED;
      // WHY: Client-side masking is presentation, not secrecy. Hidden badge
      // identity and requirement data are removed at the trusted read boundary
      // until the authenticated learner has actually unlocked the badge.
      const shouldMask = badge.isHidden && status !== CompletionStatus.COMPLETED;
      return {
        id: badge.id,
        name: shouldMask ? "Secret Badge" : badge.name,
        slug: shouldMask ? `secret-${badge.id}` : badge.slug,
        description: shouldMask
          ? "Unlock this achievement to discover it."
          : badge.description,
        icon: shouldMask ? null : badge.icon,
        category: badge.category,
        rarity: badge.rarity,
        targetValue: badge.targetValue,
        rewardAmount: badge.rewardAmount,
        isHidden: badge.isHidden,
        isActive: badge.isActive,
        progress: userProgress[0]?.progress ?? 0,
        status,
        unlockedAt: userProgress[0]?.unlockedAt ?? null,
      };
    });
  },

  /** Returns active and paused catalogue records for administrator management. */
  async findAllForAdmin(): Promise<AdminBadgeItem[]> {
    const badges = await prisma.badge.findMany({
      include: {
        _count: {
          select: {
            userProgress: {
              where: { status: CompletionStatus.COMPLETED },
            },
          },
        },
      },
      orderBy: [{ category: "asc" }, { targetValue: "asc" }],
    });
    return badges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      slug: badge.slug,
      description: badge.description,
      icon: badge.icon,
      category: badge.category,
      rarity: badge.rarity,
      targetValue: badge.targetValue,
      rewardAmount: badge.rewardAmount,
      isHidden: badge.isHidden,
      isActive: badge.isActive,
      progress: 0,
      status: CompletionStatus.NOT_STARTED,
      unlockedAt: null,
      criteriaKey: badge.criteriaKey as BadgeCriteriaKey,
      unlockCount: badge._count.userProgress,
    }));
  },

  /** Creates or edits one controlled badge definition with an audit record. */
  async saveDefinition(
    data: SaveBadgeData,
    actorId: string,
    ipAddress: string | null,
  ): Promise<string> {
    return prisma.$transaction(async (transaction) => {
      const commonData = {
        name: data.name,
        slug: data.slug,
        description: data.description,
        icon: data.icon,
        category: data.category,
        rarity: data.rarity,
        criteriaKey: data.criteriaKey,
        targetValue: data.targetValue,
        rewardAmount: BADGE_REWARD_BY_RARITY[data.rarity],
        isHidden: data.isHidden,
        isActive: data.isActive,
      };
      const badge = data.id
        ? await transaction.badge.update({
            where: { id: data.id },
            data: commonData,
            select: { id: true },
          })
        : await transaction.badge.create({
            data: { ...commonData, createdById: actorId },
            select: { id: true },
          });
      // WHY: Badge definitions directly control permanent achievements and
      // currency awards. The mutation and accountability record must commit or
      // roll back together so no privileged change can escape the audit trail.
      await transaction.auditLog.create({
        data: {
          actorId,
          action: data.id ? "BADGE_DEFINITION_UPDATED" : "BADGE_DEFINITION_CREATED",
          entityType: "Badge",
          entityId: badge.id,
          ipAddress,
          metadata: {
            criteriaKey: data.criteriaKey,
            targetValue: data.targetValue,
            rarity: data.rarity,
            isActive: data.isActive,
          },
        },
      });
      return badge.id;
    }, badgeTransactionOptions);
  },

  /** Returns the criterion required before changing a badge's active state. */
  async findCriterionById(badgeId: string): Promise<BadgeCriteriaKey | null> {
    const badge = await prisma.badge.findUnique({
      where: { id: badgeId },
      select: { criteriaKey: true },
    });
    return (badge?.criteriaKey as BadgeCriteriaKey | undefined) ?? null;
  },

  /**
   * Deletes an unearned badge and any partial progress in one audited write.
   *
   * Completed progress is checked again inside the transaction. This repository
   * method—not the disabled client button—is the authority protecting permanent
   * earned badges from deletion.
   */
  async deleteUnearned(
    badgeId: string,
    actorId: string,
    ipAddress: string | null,
  ): Promise<
    | { status: "deleted"; removedProgressCount: number }
    | { status: "earned" }
    | { status: "missing" }
  > {
    return prisma.$transaction(async (transaction) => {
      const badge = await transaction.badge.findUnique({
        where: { id: badgeId },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              userProgress: {
                where: { status: CompletionStatus.COMPLETED },
              },
            },
          },
        },
      });
      if (!badge) return { status: "missing" };
      if (badge._count.userProgress > 0) return { status: "earned" };

      const removedProgress = await transaction.userBadgeProgress.deleteMany({
        where: { badgeId },
      });
      await transaction.badge.delete({ where: { id: badgeId } });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "BADGE_DEFINITION_DELETED",
          entityType: "Badge",
          entityId: badgeId,
          ipAddress,
          metadata: {
            badgeName: badge.name,
            removedPartialProgressCount: removedProgress.count,
          },
        },
      });
      return {
        status: "deleted",
        removedProgressCount: removedProgress.count,
      };
    }, badgeTransactionOptions);
  },

  async evaluate(
    userId: string,
    event: BadgeEvent,
    occurredAt = new Date(),
  ): Promise<BadgeUnlockResult[]> {
    return prisma.$transaction(
      (transaction) =>
        evaluateBadgeProgressInTransaction(transaction, userId, event, occurredAt),
      badgeTransactionOptions,
    );
  },

  /** Toggles whether one catalogue badge participates in evaluation and display. */
  async setActive(
    badgeId: string,
    isActive: boolean,
    actorId: string,
    ipAddress: string | null,
  ): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const result = await transaction.badge.updateMany({
        where: {
          id: badgeId,
          ...(isActive
            ? { criteriaKey: { in: [...ACTIVE_BADGE_CRITERIA_VALUES] } }
            : {}),
        },
        data: { isActive },
      });
      if (result.count !== 1) {
        throw new Error("Badge criterion is not currently available.");
      }
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "BADGE_ACTIVE_STATUS_CHANGED",
          entityType: "Badge",
          entityId: badgeId,
          ipAddress,
          metadata: { isActive },
        },
      });
    });
  },

  /**
   * Grants one badge by email and records the privileged operation atomically.
   *
   * WHY: Manual grants use a distinct immutable ledger event and audit row.
   * Repeated requests return the existing unlock instead of paying twice.
   */
  async awardManually(
    badgeId: string,
    userEmail: string,
    actorId: string,
    ipAddress: string | null,
    awardedAt: Date,
  ): Promise<BadgeUnlockResult | null> {
    return prisma.$transaction(async (transaction) => {
      const [badge, user] = await Promise.all([
        transaction.badge.findUnique({ where: { id: badgeId } }),
        transaction.user.findUnique({
          where: { email: userEmail },
          select: { id: true },
        }),
      ]);
      if (!badge || !user) return null;
      await lockUserBadges(transaction, user.id);
      const existing = await transaction.userBadgeProgress.findUnique({
        where: { userId_badgeId: { userId: user.id, badgeId } },
      });
      if (existing?.status === CompletionStatus.COMPLETED) {
        const profile = await transaction.userProfile.findUniqueOrThrow({
          where: { userId: user.id },
          select: { totalGlowPoints: true },
        });
        return {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          rarity: badge.rarity,
          rewardAmount: 0,
          balance: profile.totalGlowPoints,
        };
      }

      await transaction.userBadgeProgress.upsert({
        where: { userId_badgeId: { userId: user.id, badgeId } },
        update: {
          progress: badge.targetValue,
          status: CompletionStatus.COMPLETED,
          unlockedAt: awardedAt,
        },
        create: {
          userId: user.id,
          badgeId,
          progress: badge.targetValue,
          status: CompletionStatus.COMPLETED,
          unlockedAt: awardedAt,
        },
      });
      await transaction.rewardLedger.create({
        data: {
          userId: user.id,
          amount: badge.rewardAmount,
          eventType: RewardEventType.MANUAL_ADMIN_AWARD,
          reason: `Manual badge award: ${badge.name}`,
          idempotencyKey: `manual-badge:${user.id}:${badge.id}`,
        },
      });
      const profile = await transaction.userProfile.update({
        where: { userId: user.id },
        data: { totalGlowPoints: { increment: badge.rewardAmount } },
        select: { totalGlowPoints: true },
      });

      // WHY: A manual badge grant can occur while the recipient is offline and
      // therefore has no client-side completion flow available to celebrate it.
      // Persisting the unread notice in this same transaction guarantees the
      // badge, reward, balance, audit trail, and player feedback either all
      // commit together or all roll back. The badge/user key also makes retries
      // idempotent without adding a separate lookup or notification poll.
      await transaction.userNotification.create({
        data: {
          userId: user.id,
          type: UserNotificationType.BADGE_AWARDED,
          dedupeKey: `manual-badge-awarded:${user.id}:${badge.id}`,
          payload: {
            badgeName: badge.name,
            rewardAmount: badge.rewardAmount,
          },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "BADGE_MANUAL_AWARD",
          entityType: "Badge",
          entityId: badge.id,
          ipAddress,
          metadata: { targetUserId: user.id, rewardAmount: badge.rewardAmount },
        },
      });
      return {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        rarity: badge.rarity,
        rewardAmount: badge.rewardAmount,
        balance: profile.totalGlowPoints,
      };
    }, badgeTransactionOptions);
  },
} as const;
