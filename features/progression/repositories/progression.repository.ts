import {
  CompletionStatus,
  DayLevel,
  Prisma,
  WaypointStatus,
  type DayLevel as DayLevelValue,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateDay2UnlockTime,
  calculateDay3UnlockTime,
  getNextDayLevel,
  getPreviousDayLevel,
  isDayPlayable,
} from "@/features/progression/lib/progression-utils";
import type {
  CompleteDayResult,
  InitializeProgressionResult,
  ProgressionConflictCode,
} from "@/features/progression/types/progression.types";

const progressionTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

/** Domain conflict that a trusted caller can map to a safe application error code. */
export class ProgressionConflictError extends Error {
  /** Creates a typed conflict without exposing database details to the client. */
  constructor(
    readonly code: ProgressionConflictCode,
    readonly unlocksAt: Date | null = null,
  ) {
    super(code);
    this.name = "ProgressionConflictError";
  }
}

/** Serializes transitions for one learner and waypoint against repeat requests. */
async function lockProgression(
  transaction: Prisma.TransactionClient,
  userId: string,
  waypointId: string,
): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-progression'), hashtext(${`${userId}:${waypointId}`}))`;
}

/** Serializes idempotent first-waypoint initialization for one learner. */
async function lockInitialization(
  transaction: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-progression-user'), hashtext(${userId}))`;
}

/** Finds only curriculum that remains playable at the moment of the query. */
async function findAvailableWaypoint(
  transaction: Prisma.TransactionClient,
  where: Prisma.WaypointWhereInput,
): Promise<{ id: string; number: number } | null> {
  return transaction.waypoint.findFirst({
    where: { ...where, isActive: true, verse: { isActive: true } },
    select: { id: true, number: true },
    orderBy: { number: "asc" },
  });
}

/** Ensures the selected waypoint and verse are still published before play. */
async function requireAvailableWaypoint(
  transaction: Prisma.TransactionClient,
  waypointId: string,
): Promise<{ id: string; number: number }> {
  const waypoint = await findAvailableWaypoint(transaction, { id: waypointId });
  if (!waypoint) throw new ProgressionConflictError("WAYPOINT_UNAVAILABLE");
  return waypoint;
}

/** Calculates the following day's unlock without relying on browser time. */
function calculateNextUnlock(dayLevel: DayLevelValue, completedAt: Date): Date | null {
  if (dayLevel === DayLevel.GLIMMER) return calculateDay2UnlockTime(completedAt);
  if (dayLevel === DayLevel.GLOW) return calculateDay3UnlockTime(completedAt);
  return null;
}

/** Creates the next day lazily inside the caller's completion transaction. */
async function setNextDayUnlockInTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
  waypointId: string,
  completedDay: DayLevelValue,
  unlocksAt: Date,
): Promise<void> {
  const nextDay = getNextDayLevel(completedDay);
  if (!nextDay) return;

  await transaction.userDayProgress.upsert({
    where: { userId_waypointId_dayLevel: { userId, waypointId, dayLevel: nextDay } },
    update: { unlocksAt },
    create: { userId, waypointId, dayLevel: nextDay, unlocksAt },
  });
}

/** Unlocks the next currently published waypoint without assuming number N+1. */
async function unlockNextWaypointInTransaction(
  transaction: Prisma.TransactionClient,
  userId: string,
  currentWaypointNumber: number,
  unlockedAt: Date,
): Promise<{ id: string; number: number } | null> {
  const nextWaypoint = await findAvailableWaypoint(transaction, {
    number: { gt: currentWaypointNumber },
  });
  if (!nextWaypoint) return null;

  const existing = await transaction.userWaypointProgress.findUnique({
    where: { userId_waypointId: { userId, waypointId: nextWaypoint.id } },
  });
  await transaction.userWaypointProgress.upsert({
    where: { userId_waypointId: { userId, waypointId: nextWaypoint.id } },
    // WHY: Lazy progression normally has no row here, but upgrading a legacy
    // LOCKED row must genuinely unlock it without regressing advanced states.
    update: existing?.status === WaypointStatus.LOCKED
      ? { status: WaypointStatus.UNLOCKED, unlockedAt }
      : {},
    create: {
      userId,
      waypointId: nextWaypoint.id,
      status: WaypointStatus.UNLOCKED,
      unlockedAt,
    },
  });
  return nextWaypoint;
}

/** Database boundary for lazy, server-authoritative learner progression. */
export const progressionRepository = {
  /** Returns one learner's persisted waypoint state, or null while it is lazy. */
  async getUserWaypointProgress(userId: string, waypointId: string) {
    return prisma.userWaypointProgress.findUnique({
      where: { userId_waypointId: { userId, waypointId } },
    });
  },

  /** Returns one learner's persisted challenge-day state. */
  async getUserDayProgress(
    userId: string,
    waypointId: string,
    dayLevel: DayLevelValue,
  ) {
    return prisma.userDayProgress.findUnique({
      where: { userId_waypointId_dayLevel: { userId, waypointId, dayLevel } },
    });
  },

  /**
   * Lazily unlocks only the first available published waypoint.
   * Existing progression wins, making login and onboarding retries idempotent.
   */
  async initializeFirstWaypoint(userId: string): Promise<InitializeProgressionResult> {
    return prisma.$transaction(async (transaction) => {
      await lockInitialization(transaction, userId);
      const existing = await transaction.userWaypointProgress.findFirst({
        where: { userId },
        select: { waypointId: true, waypoint: { select: { number: true } } },
        orderBy: { createdAt: "asc" },
      });
      if (existing) {
        return {
          status: "ready",
          waypointId: existing.waypointId,
          waypointNumber: existing.waypoint.number,
        };
      }

      const firstWaypoint = await findAvailableWaypoint(transaction, {});
      if (!firstWaypoint) return { status: "curriculum-unavailable" };

      await transaction.userWaypointProgress.create({
        data: {
          userId,
          waypointId: firstWaypoint.id,
          status: WaypointStatus.UNLOCKED,
          unlockedAt: new Date(),
        },
      });
      return {
        status: "ready",
        waypointId: firstWaypoint.id,
        waypointNumber: firstWaypoint.number,
      };
    }, progressionTransactionOptions);
  },

  /**
   * Starts a day only after server-side publication, order, and cooldown checks.
   * Future gameplay actions call this before creating a game session.
   */
  async prepareDayForGameplay(
    userId: string,
    waypointId: string,
    dayLevel: DayLevelValue,
    startedAt: Date,
  ) {
    return prisma.$transaction(async (transaction) => {
      await lockProgression(transaction, userId, waypointId);
      await requireAvailableWaypoint(transaction, waypointId);
      const waypointProgress = await transaction.userWaypointProgress.findUnique({
        where: { userId_waypointId: { userId, waypointId } },
      });
      if (!waypointProgress || waypointProgress.status === WaypointStatus.LOCKED) {
        throw new ProgressionConflictError("WAYPOINT_LOCKED");
      }
      if (waypointProgress.status === WaypointStatus.COMPLETED) {
        throw new ProgressionConflictError("DAY_ALREADY_COMPLETED");
      }

      const previousDay = getPreviousDayLevel(dayLevel);
      if (previousDay) {
        const previousProgress = await transaction.userDayProgress.findUnique({
          where: { userId_waypointId_dayLevel: { userId, waypointId, dayLevel: previousDay } },
        });
        if (previousProgress?.status !== CompletionStatus.COMPLETED) {
          throw new ProgressionConflictError("PREVIOUS_DAY_INCOMPLETE");
        }
      }

      const dayProgress = await transaction.userDayProgress.findUnique({
        where: { userId_waypointId_dayLevel: { userId, waypointId, dayLevel } },
      });
      if (dayProgress?.status === CompletionStatus.COMPLETED) {
        throw new ProgressionConflictError("DAY_ALREADY_COMPLETED");
      }
      if (dayLevel !== DayLevel.GLIMMER && !dayProgress) {
        throw new ProgressionConflictError("DAY_NOT_INITIALIZED");
      }
      if (dayProgress && !isDayPlayable(dayProgress, startedAt)) {
        throw new ProgressionConflictError("DAY_COOLDOWN_ACTIVE", dayProgress.unlocksAt);
      }

      const prepared = await transaction.userDayProgress.upsert({
        where: { userId_waypointId_dayLevel: { userId, waypointId, dayLevel } },
        update: { status: CompletionStatus.IN_PROGRESS, startedAt: dayProgress?.startedAt ?? startedAt },
        create: {
          userId,
          waypointId,
          dayLevel,
          status: CompletionStatus.IN_PROGRESS,
          startedAt,
        },
      });
      await transaction.userWaypointProgress.update({
        where: { userId_waypointId: { userId, waypointId } },
        data: {
          status: WaypointStatus.IN_PROGRESS,
          startedAt: waypointProgress.startedAt ?? startedAt,
        },
      });
      return prepared;
    }, progressionTransactionOptions);
  },

  /**
   * Atomically completes a trusted in-progress day and advances progression.
   * Day 3 completion, waypoint completion, and next-waypoint unlock cannot split.
   */
  async markDayComplete(
    userId: string,
    waypointId: string,
    dayLevel: DayLevelValue,
    completedAt: Date,
  ): Promise<CompleteDayResult> {
    return prisma.$transaction(async (transaction) => {
      await lockProgression(transaction, userId, waypointId);
      const waypoint = await requireAvailableWaypoint(transaction, waypointId);
      const waypointProgress = await transaction.userWaypointProgress.findUnique({
        where: { userId_waypointId: { userId, waypointId } },
      });
      if (!waypointProgress || waypointProgress.status === WaypointStatus.LOCKED) {
        throw new ProgressionConflictError("WAYPOINT_LOCKED");
      }

      const dayProgress = await transaction.userDayProgress.findUnique({
        where: { userId_waypointId_dayLevel: { userId, waypointId, dayLevel } },
      });
      if (dayProgress?.status === CompletionStatus.COMPLETED) {
        throw new ProgressionConflictError("DAY_ALREADY_COMPLETED");
      }
      // WHY: Only a server-started game can create IN_PROGRESS state. This keeps
      // a client from skipping the gameplay proof and calling completion directly.
      if (dayProgress?.status !== CompletionStatus.IN_PROGRESS) {
        throw new ProgressionConflictError("DAY_NOT_INITIALIZED");
      }

      const previousDay = getPreviousDayLevel(dayLevel);
      if (previousDay) {
        const previousProgress = await transaction.userDayProgress.findUnique({
          where: { userId_waypointId_dayLevel: { userId, waypointId, dayLevel: previousDay } },
        });
        if (previousProgress?.status !== CompletionStatus.COMPLETED) {
          throw new ProgressionConflictError("PREVIOUS_DAY_INCOMPLETE");
        }
      }

      await transaction.userDayProgress.update({
        where: { id: dayProgress.id },
        data: { status: CompletionStatus.COMPLETED, completedAt },
      });

      const nextDayUnlocksAt = calculateNextUnlock(dayLevel, completedAt);
      if (nextDayUnlocksAt) {
        await setNextDayUnlockInTransaction(
          transaction,
          userId,
          waypointId,
          dayLevel,
          nextDayUnlocksAt,
        );
        await transaction.userWaypointProgress.update({
          where: { userId_waypointId: { userId, waypointId } },
          data: { status: WaypointStatus.COOLDOWN },
        });
        return {
          completedDay: dayLevel,
          nextDayUnlocksAt,
          unlockedWaypoint: null,
          caughtUp: false,
        };
      }

      await transaction.userWaypointProgress.update({
        where: { userId_waypointId: { userId, waypointId } },
        data: { status: WaypointStatus.COMPLETED, completedAt },
      });
      const unlockedWaypoint = await unlockNextWaypointInTransaction(
        transaction,
        userId,
        waypoint.number,
        completedAt,
      );
      return {
        completedDay: dayLevel,
        nextDayUnlocksAt: null,
        unlockedWaypoint,
        caughtUp: unlockedWaypoint === null,
      };
    }, progressionTransactionOptions);
  },

  /** Sets the following day's timestamp in its own guarded transaction. */
  async setNextDayUnlock(
    userId: string,
    waypointId: string,
    dayLevel: DayLevelValue,
    unlockedAt: Date,
  ): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      await lockProgression(transaction, userId, waypointId);
      await setNextDayUnlockInTransaction(transaction, userId, waypointId, dayLevel, unlockedAt);
    }, progressionTransactionOptions);
  },

  /** Marks an existing learner waypoint complete without creating locked rows. */
  async markWaypointComplete(
    userId: string,
    waypointId: string,
    completedAt: Date = new Date(),
  ): Promise<void> {
    await prisma.userWaypointProgress.update({
      where: { userId_waypointId: { userId, waypointId } },
      data: { status: WaypointStatus.COMPLETED, completedAt },
    });
  },

  /** Unlocks the next available published waypoint, or returns null when caught up. */
  async unlockNextWaypoint(
    userId: string,
    currentWaypointNumber: number,
    unlockedAt: Date = new Date(),
  ): Promise<{ id: string; number: number } | null> {
    return prisma.$transaction(
      (transaction) => unlockNextWaypointInTransaction(
        transaction,
        userId,
        currentWaypointNumber,
        unlockedAt,
      ),
      progressionTransactionOptions,
    );
  },
} as const;
