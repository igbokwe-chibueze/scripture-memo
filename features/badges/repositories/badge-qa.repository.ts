import {
  CompletionStatus,
  JourneyStage,
  RewardEventType,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const FIRST_STEPS_SLUG = "first-steps";

export type FirstStepsBadgeVerification = {
  verified: boolean;
  learnWaypointCompleted: boolean;
  badgeUnlockedOnce: boolean;
  rewardRecordedOnce: boolean;
};

/**
 * Read-only QA queries for badge acceptance testing.
 *
 * These checks intentionally inspect existing trusted progression and ledger
 * history. They never evaluate badges again, grant rewards, or modify learner
 * state, which makes the verification safe to repeat during development.
 */
export const badgeQaRepository = {
  async verifyFirstStepsBadge(
    userId: string,
    waypointId: string,
  ): Promise<FirstStepsBadgeVerification> {
    const [waypointProgress, badge] = await Promise.all([
      prisma.userWaypointProgress.findFirst({
        where: {
          userId,
          waypointId,
          status: CompletionStatus.COMPLETED,
          waypoint: {
            journeyStage: JourneyStage.LEARN,
          },
        },
        select: { id: true },
      }),
      prisma.badge.findUnique({
        where: { slug: FIRST_STEPS_SLUG },
        select: {
          id: true,
          rewardAmount: true,
          userProgress: {
            where: {
              userId,
              status: CompletionStatus.COMPLETED,
            },
            select: { id: true },
          },
        },
      }),
    ]);

    const badgeProgressCount = badge?.userProgress.length ?? 0;
    const rewardLedgerCount = badge
      ? await prisma.rewardLedger.count({
          where: {
            userId,
            eventType: RewardEventType.BADGE_UNLOCK,
            idempotencyKey: `badge-unlock:${userId}:${badge.id}`,
            amount: badge.rewardAmount,
          },
        })
      : 0;
    const learnWaypointCompleted = Boolean(waypointProgress);
    const badgeUnlockedOnce = badgeProgressCount === 1;
    const rewardRecordedOnce = rewardLedgerCount === 1;

    return {
      verified:
        learnWaypointCompleted &&
        badgeUnlockedOnce &&
        rewardRecordedOnce,
      learnWaypointCompleted,
      badgeUnlockedOnce,
      rewardRecordedOnce,
    };
  },
} as const;
