import {
  CompletionStatus,
  GameModeAttemptStatus,
  JourneyStage,
} from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { GAME_MODE_ORDER } from "@/lib/constants";
import { calculateHintBalance } from "@/features/hints/lib/hint-balance";

export type HintAccountingVerification = {
  verified: boolean;
  usedOnceInCurrentMode: boolean;
  profileCounterMatches: boolean;
  remainingHints: number;
};

/** Read-only database checks used by the Phase 30 hint acceptance flow. */
export const hintQaRepository = {
  /**
   * Verifies one real Learn hint against persisted inventory and counters.
   *
   * The query never consumes a hint. It requires exactly one usage in the
   * current mode, then recomputes the remaining balance from trusted usage and
   * purchase history so the check is safe to repeat.
   */
  async verifyLearnHintAccounting(
    userId: string,
    sessionId: string,
  ): Promise<HintAccountingVerification> {
    const session = await prisma.gameSession.findFirst({
      where: {
        id: sessionId,
        userId,
        status: CompletionStatus.IN_PROGRESS,
        isVaultReplay: false,
        isAdminTest: false,
        waypoint: { journeyStage: JourneyStage.LEARN },
      },
      select: {
        attempts: {
          where: { status: GameModeAttemptStatus.COMPLETED },
          select: { gameMode: true },
        },
      },
    });
    if (!session) {
      return {
        verified: false,
        usedOnceInCurrentMode: false,
        profileCounterMatches: false,
        remainingHints: 0,
      };
    }

    const completedModes = new Set(
      session.attempts.map(({ gameMode }) => gameMode),
    );
    const currentMode = GAME_MODE_ORDER.find(
      (mode) => !completedModes.has(mode),
    );
    if (!currentMode) {
      return {
        verified: false,
        usedOnceInCurrentMode: false,
        profileCounterMatches: false,
        remainingHints: 0,
      };
    }

    const [currentModeUsage, totalUsage, purchasedHints, profile] =
      await Promise.all([
        prisma.hintUsage.count({
          where: {
            userId,
            gameSessionId: sessionId,
            gameMode: currentMode,
          },
        }),
        prisma.hintUsage.count({ where: { userId } }),
        prisma.userShopPurchase.aggregate({
          where: {
            userId,
            shopItem: { itemType: "HINT_PACK" },
          },
          _sum: { entitlementQuantity: true },
        }),
        prisma.userProfile.findUnique({
          where: { userId },
          select: { totalHintsUsed: true },
        }),
      ]);

    const usedOnceInCurrentMode = currentModeUsage === 1;
    const profileCounterMatches = profile?.totalHintsUsed === totalUsage;
    const remainingHints = calculateHintBalance(
      totalUsage,
      purchasedHints._sum.entitlementQuantity ?? 0,
    );

    return {
      verified: usedOnceInCurrentMode && profileCounterMatches,
      usedOnceInCurrentMode,
      profileCounterMatches,
      remainingHints,
    };
  },
} as const;
