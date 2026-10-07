import {
  CompletionStatus,
  GameModeAttemptStatus,
} from "@/lib/generated/prisma/enums";
import type {
  DayLevel,
  Prisma,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getDayRewardIdempotencyKey } from "@/features/rewards/lib/day-reward";

/**
 * Private sentinel used to force a probe transaction to roll back when a
 * duplicate insert unexpectedly succeeds. This makes a failed QA check safe:
 * the temporary row can never commit even if its unique constraint is absent.
 */
class RollbackIdempotencyProbeError extends Error {}

/** Reads a Prisma error code without depending on a generated error class. */
function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

/**
 * Attempts a duplicate write and reports whether PostgreSQL rejected it.
 * Every successful insert is followed by a deliberate throw, guaranteeing
 * rollback rather than allowing a diagnostic operation to alter real data.
 */
async function probeUniqueConstraint(
  writeDuplicate: (transaction: Prisma.TransactionClient) => Promise<unknown>,
): Promise<boolean> {
  try {
    await prisma.$transaction(async (transaction) => {
      await writeDuplicate(transaction);
      throw new RollbackIdempotencyProbeError();
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) return true;
    if (error instanceof RollbackIdempotencyProbeError) return false;
    throw error;
  }

  return false;
}

export type CompletionIdempotencyVerification = {
  protected: boolean;
  sessionTerminal: boolean;
  glowLedgerProtected: boolean;
  beaconLedgerProtected: boolean;
  stateUnchanged: boolean;
};

export const gameplayQaRepository = {
  /**
   * Safely verifies the duplicate-completion defenses for one completed day.
   *
   * The method performs bounded reads and two short rollback-only transactions.
   * It never invokes progression, rewards, badges, streaks, or notifications.
   */
  async verifyCompletionIdempotency(
    userId: string,
    waypointId: string,
    dayLevel: DayLevel,
  ): Promise<CompletionIdempotencyVerification> {
    const rewardKey = getDayRewardIdempotencyKey(
      userId,
      waypointId,
      dayLevel,
    );
    const [session, rewardLedger, profile] = await Promise.all([
      prisma.gameSession.findFirst({
        where: {
          userId,
          waypointId,
          dayLevel,
          status: CompletionStatus.COMPLETED,
          isVaultReplay: false,
          isAdminTest: false,
        },
        orderBy: { completedAt: "desc" },
        select: {
          id: true,
          status: true,
          attempts: {
            where: { status: GameModeAttemptStatus.COMPLETED },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      }),
      prisma.rewardLedger.findUnique({
        where: { idempotencyKey: rewardKey },
        select: {
          userId: true,
          amount: true,
          eventType: true,
          reason: true,
          idempotencyKey: true,
        },
      }),
      prisma.userProfile.findUnique({
        where: { userId },
        select: {
          totalGlowPoints: true,
          beaconXp: true,
        },
      }),
    ]);

    const finalAttemptId = session?.attempts[0]?.id;
    if (!session || !rewardLedger || !profile || !finalAttemptId) {
      return {
        protected: false,
        sessionTerminal: false,
        glowLedgerProtected: false,
        beaconLedgerProtected: false,
        stateUnchanged: true,
      };
    }

    const beaconKey = `mode:${finalAttemptId}`;
    const beaconLedger = await prisma.beaconXpLedger.findUnique({
      where: { idempotencyKey: beaconKey },
      select: {
        userId: true,
        amount: true,
        reason: true,
        idempotencyKey: true,
        earnedAt: true,
      },
    });
    if (!beaconLedger) {
      return {
        protected: false,
        sessionTerminal: true,
        glowLedgerProtected: false,
        beaconLedgerProtected: false,
        stateUnchanged: true,
      };
    }

    const glowLedgerProtected = await probeUniqueConstraint((transaction) =>
      transaction.rewardLedger.create({
        data: rewardLedger,
      }),
    );
    const beaconLedgerProtected = await probeUniqueConstraint((transaction) =>
      transaction.beaconXpLedger.create({
        data: beaconLedger,
      }),
    );

    // Re-read the two balances after both rollback-only probes. This is an
    // explicit safety assertion rather than assuming rollback behavior.
    const profileAfterProbe = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        totalGlowPoints: true,
        beaconXp: true,
      },
    });
    const stateUnchanged =
      profileAfterProbe?.totalGlowPoints === profile.totalGlowPoints &&
      profileAfterProbe.beaconXp === profile.beaconXp;
    const sessionTerminal = session.status === CompletionStatus.COMPLETED;

    return {
      protected:
        sessionTerminal &&
        glowLedgerProtected &&
        beaconLedgerProtected &&
        stateUnchanged,
      sessionTerminal,
      glowLedgerProtected,
      beaconLedgerProtected,
      stateUnchanged,
    };
  },
} as const;
