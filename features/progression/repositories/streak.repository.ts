import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateStreakUpdate,
  getStreakForecast,
  type NextStreakLevel,
  type StreakForecastDay,
  type StreakUpdate,
} from "@/features/progression/lib/streak-utils";

export type PersistedStreakUpdate = StreakUpdate & {
  forecast: StreakForecastDay[];
  nextLevel: NextStreakLevel | null;
};

/** Serializes streak activity across different concurrent gameplay sessions. */
async function lockUserStreak(
  transaction: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-streak'), hashtext(${userId}))`;
}

/**
 * Records one server-verified mode completion inside its existing transaction.
 *
 * Replays never call this boundary. Same-local-day submissions are idempotent,
 * while the advisory lock prevents two sessions from racing the first update.
 */
export async function updateStreakInTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
  activityDate: Date,
): Promise<PersistedStreakUpdate> {
  await lockUserStreak(transaction, userId);
  const [streak, settings] = await Promise.all([
    transaction.userStreak.findUnique({ where: { userId } }),
    transaction.userSettings.findUnique({
      where: { userId },
      select: { timeZone: true },
    }),
  ]);
  const update = calculateStreakUpdate(
    {
      currentStreak: streak?.currentStreak ?? 0,
      bestStreak: streak?.bestStreak ?? 0,
      lastActiveAt: streak?.lastActiveAt ?? null,
    },
    activityDate,
    settings?.timeZone ?? "UTC",
  );
  if (update.changed) {
    await transaction.userStreak.upsert({
      where: { userId },
      update: {
        currentStreak: update.currentStreak,
        bestStreak: update.bestStreak,
        lastActiveAt: update.lastActiveAt,
      },
      create: {
        userId,
        currentStreak: update.currentStreak,
        bestStreak: update.bestStreak,
        lastActiveAt: update.lastActiveAt,
      },
    });
  }

  const forecast = getStreakForecast(
    activityDate,
    settings?.timeZone ?? "UTC",
    update.currentStreak,
  );
  return {
    ...update,
    forecast: forecast.days,
    nextLevel: forecast.nextLevel,
  };
}

/** Standalone repository facade retained for maintenance and focused tests. */
export const streakRepository = {
  async updateStreak(
    userId: string,
    activityDate: Date,
  ): Promise<PersistedStreakUpdate> {
    return prisma.$transaction((transaction) =>
      updateStreakInTransaction(transaction, userId, activityDate),
    );
  },
} as const;
