import {
  CompletionStatus,
  GameModeAttemptStatus,
  Prisma,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { GAME_MODE_ORDER } from "@/lib/constants";
import { calculateHintBalance } from "@/features/hints/lib/hint-balance";
import type {
  HintConflictCode,
  UseHintResult,
} from "@/features/hints/types/hint.types";

const hintTransactionOptions = { maxWait: 10_000, timeout: 30_000 } as const;

/** Trusted conflict that the action maps to a safe learner-facing response. */
export class HintConflictError extends Error {
  constructor(readonly code: HintConflictCode) {
    super(code);
    this.name = "HintConflictError";
  }
}

/** Serializes free-hint consumption so concurrent clicks cannot overspend. */
async function lockHintBalance(
  transaction: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-hints'), hashtext(${userId}))`;
}

/** Database boundary for server-authoritative hint balances and consumption. */
export const hintRepository = {
  /**
   * Returns free hints not yet consumed.
   *
   * Purchased entitlements intentionally contribute zero until Phase 22 adds
   * an explicit hint quantity to shop products; generic purchases are never
   * guessed to be hint credits.
   */
  async getHintBalance(userId: string): Promise<number> {
    const [usedHints, purchased] = await Promise.all([
      prisma.hintUsage.count({ where: { userId } }),
      prisma.userShopPurchase.aggregate({
        where: { userId, shopItem: { itemType: "HINT_PACK" } },
        _sum: { entitlementQuantity: true },
      }),
    ]);
    return calculateHintBalance(usedHints, purchased._sum.entitlementQuantity ?? 0);
  },

  /**
   * Consumes one hint only after rechecking ownership, stage, and balance.
   *
   * WHY: Journey Stage and hint balance checks happen inside the transaction,
   * not in the client. A crafted action request cannot reveal a Strengthen or
   * Master verse, access another learner's session, or spend the same final
   * hint twice.
   */
  async useHint(
    userId: string,
    sessionId: string,
    allowAdminTest: boolean,
  ): Promise<UseHintResult> {
    return prisma.$transaction(async (transaction) => {
      const session = await transaction.gameSession.findFirst({
        where: {
          id: sessionId,
          userId,
          isVaultReplay: false,
          status: CompletionStatus.IN_PROGRESS,
        },
        select: {
          id: true,
          translation: true,
          isAdminTest: true,
          waypoint: { select: { journeyStage: true } },
          verse: {
            select: {
              reference: true,
              translations: { select: { translation: true, text: true } },
            },
          },
          attempts: {
            where: { status: GameModeAttemptStatus.COMPLETED },
            select: { gameMode: true },
          },
        },
      });
      if (!session?.waypoint) throw new HintConflictError("SESSION_UNAVAILABLE");
      if (session.isAdminTest && !allowAdminTest) {
        throw new HintConflictError("SESSION_UNAVAILABLE");
      }
      if (
        session.waypoint.journeyStage === "STRENGTHEN" ||
        session.waypoint.journeyStage === "MASTER"
      ) {
        throw new HintConflictError("STAGE_DISALLOWS_HINTS");
      }

      const completedModes = new Set(session.attempts.map(({ gameMode }) => gameMode));
      const currentMode = GAME_MODE_ORDER.find((mode) => !completedModes.has(mode));
      if (!currentMode) throw new HintConflictError("SESSION_UNAVAILABLE");
      const translation = session.verse.translations.find(
        ({ translation: code }) => code === session.translation,
      );
      if (!translation) throw new HintConflictError("SESSION_UNAVAILABLE");

      // WHY: Admin stage testing must exercise the same server-side stage gate,
      // but it must never consume inventory or increment hint statistics.
      if (session.isAdminTest) {
        return {
          reference: session.verse.reference,
          verseText: translation.text,
          remainingHints: 0,
        };
      }

      // Only real inventory consumption needs serialization. Admin diagnostics
      // remain a read-only path and avoid an unnecessary database lock/write.
      await lockHintBalance(transaction, userId);

      const [usedHints, purchased] = await Promise.all([
        transaction.hintUsage.count({ where: { userId } }),
        transaction.userShopPurchase.aggregate({
          where: { userId, shopItem: { itemType: "HINT_PACK" } },
          _sum: { entitlementQuantity: true },
        }),
      ]);
      const remainingBeforeUse = calculateHintBalance(
        usedHints,
        purchased._sum.entitlementQuantity ?? 0,
      );
      if (remainingBeforeUse <= 0) {
        throw new HintConflictError("NO_HINTS_REMAINING");
      }

      await transaction.hintUsage.create({
        data: { userId, gameSessionId: session.id, gameMode: currentMode },
      });
      await transaction.userProfile.update({
        where: { userId },
        data: { totalHintsUsed: { increment: 1 } },
      });
      return {
        reference: session.verse.reference,
        verseText: translation.text,
        remainingHints: remainingBeforeUse - 1,
      };
    }, hintTransactionOptions);
  },
} as const;
