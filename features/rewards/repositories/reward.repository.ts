import { DayLevel, Prisma, RewardEventType } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getDayRewardAmount,
  getDayRewardIdempotencyKey,
} from "@/features/rewards/lib/day-reward";
import type {
  DayRewardResult,
  RewardHistoryInput,
} from "@/features/rewards/types/reward.types";

/**
 * Awards a server-proven day completion inside the gameplay transaction.
 *
 * WHY: Glow Points are never updated without a corresponding RewardLedger
 * record. The ledger provides an immutable audit trail of all point events.
 * If a user's displayed balance ever looks wrong, the ledger can be summed to
 * reconstruct the correct total. The unique idempotency key is the final
 * database defense against duplicate rewards.
 */
export async function awardDayCompletionRewardInTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
  waypointId: string,
  dayLevel: DayLevel,
): Promise<DayRewardResult> {
  const amount = getDayRewardAmount(dayLevel);
  await transaction.rewardLedger.create({
    data: {
      userId,
      amount,
      eventType: RewardEventType.DAY_COMPLETE,
      reason: `${dayLevel} challenge completed`,
      idempotencyKey: getDayRewardIdempotencyKey(userId, waypointId, dayLevel),
    },
  });
  const profile = await transaction.userProfile.update({
    where: { userId },
    data: { totalGlowPoints: { increment: amount } },
    select: { totalGlowPoints: true },
  });
  return { dayLevel, amount, balance: profile.totalGlowPoints };
}

/** Read-only reward queries used by balances and future Vault history views. */
export const rewardRepository = {
  /** Returns the persisted running balance, defaulting safely before onboarding. */
  async getUserBalance(userId: string): Promise<number> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { totalGlowPoints: true },
    });
    return profile?.totalGlowPoints ?? 0;
  },

  /** Returns one bounded page of newest-first immutable ledger events. */
  async getRewardHistory(
    userId: string,
    input: RewardHistoryInput = {},
  ): Promise<Array<{
    id: string;
    amount: number;
    eventType: RewardEventType;
    reason: string;
    createdAt: Date;
  }>> {
    const take = Math.min(Math.max(input.take ?? 20, 1), 100);
    return prisma.rewardLedger.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(input.cursor
        ? { cursor: { id: input.cursor }, skip: 1 }
        : {}),
      select: {
        id: true,
        amount: true,
        eventType: true,
        reason: true,
        createdAt: true,
      },
    });
  },
} as const;
