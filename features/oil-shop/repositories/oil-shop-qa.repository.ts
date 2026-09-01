import { RewardEventType } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateHintBalance } from "@/features/hints/lib/hint-balance";
import { HINT_PACK_ITEM_TYPE } from "@/features/oil-shop/data/hint-shop-catalog";

export type PurchaseHistoryVerification = {
  verified: boolean;
  itemName: string | null;
  balanceBefore: number;
  balanceAfter: number;
  hintsBefore: number;
  hintsAfter: number;
};

export type InsufficientBalanceVerification = {
  protected: boolean;
  balanceBefore: number;
  balanceAfter: number;
  attemptedCost: number;
};

/**
 * Administrator-only database diagnostics for the Phase 30 Oil Shop flow.
 *
 * These methods always inspect the signed-in administrator's own account. The
 * real-purchase check is read-only. The insufficient-funds probe uses the same
 * conditional decrement as production with an intentionally unaffordable
 * amount; PostgreSQL therefore updates zero rows and no balance is changed.
 */
export const oilShopQaRepository = {
  /** Reconstructs exact before/after values from the latest durable purchase. */
  async verifyLatestPurchase(
    userId: string,
  ): Promise<PurchaseHistoryVerification> {
    const latestPurchase = await prisma.userShopPurchase.findFirst({
      where: {
        userId,
        shopItem: { itemType: HINT_PACK_ITEM_TYPE },
      },
      orderBy: { purchasedAt: "desc" },
      select: {
        totalCost: true,
        entitlementQuantity: true,
        idempotencyKey: true,
        shopItem: { select: { name: true } },
      },
    });

    if (!latestPurchase) {
      return {
        verified: false,
        itemName: null,
        balanceBefore: 0,
        balanceAfter: 0,
        hintsBefore: 0,
        hintsAfter: 0,
      };
    }

    const [profile, usedHintCount, purchasedHintTotal, matchingLedger] =
      await Promise.all([
        prisma.userProfile.findUnique({
          where: { userId },
          select: { totalGlowPoints: true },
        }),
        prisma.hintUsage.count({ where: { userId } }),
        prisma.userShopPurchase.aggregate({
          where: {
            userId,
            shopItem: { itemType: HINT_PACK_ITEM_TYPE },
          },
          _sum: { entitlementQuantity: true },
        }),
        prisma.rewardLedger.findUnique({
          where: {
            idempotencyKey: `shop:${latestPurchase.idempotencyKey}`,
          },
          select: {
            userId: true,
            amount: true,
            eventType: true,
          },
        }),
      ]);

    const balanceAfter = profile?.totalGlowPoints ?? 0;
    const purchasedHints =
      purchasedHintTotal._sum.entitlementQuantity ?? 0;
    const hintsAfter = calculateHintBalance(usedHintCount, purchasedHints);
    const hintsBefore = calculateHintBalance(
      usedHintCount,
      purchasedHints - latestPurchase.entitlementQuantity,
    );
    const ledgerMatches =
      matchingLedger?.userId === userId &&
      matchingLedger.amount === -latestPurchase.totalCost &&
      matchingLedger.eventType === RewardEventType.SHOP_PURCHASE;

    return {
      verified:
        Boolean(profile) &&
        purchasedHints >= latestPurchase.entitlementQuantity &&
        ledgerMatches &&
        balanceAfter >= 0,
      itemName: latestPurchase.shopItem.name,
      balanceBefore: balanceAfter + latestPurchase.totalCost,
      balanceAfter,
      hintsBefore,
      hintsAfter,
    };
  },

  /**
   * Proves an unaffordable production-style decrement updates no profile row.
   *
   * The advisory lock prevents a concurrent real purchase from making the
   * before/after comparison ambiguous while this short diagnostic runs.
   */
  async verifyInsufficientBalanceGuard(
    userId: string,
  ): Promise<InsufficientBalanceVerification> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-shop'), hashtext(${userId}))`;

      const before = await transaction.userProfile.findUnique({
        where: { userId },
        select: { totalGlowPoints: true },
      });
      if (!before) {
        return {
          protected: false,
          balanceBefore: 0,
          balanceAfter: 0,
          attemptedCost: 1,
        };
      }

      const attemptedCost = before.totalGlowPoints + 1;
      const deduction = await transaction.userProfile.updateMany({
        where: {
          userId,
          totalGlowPoints: { gte: attemptedCost },
        },
        data: { totalGlowPoints: { decrement: attemptedCost } },
      });
      const after = await transaction.userProfile.findUnique({
        where: { userId },
        select: { totalGlowPoints: true },
      });
      const balanceAfter = after?.totalGlowPoints ?? -1;

      return {
        protected:
          deduction.count === 0 &&
          balanceAfter === before.totalGlowPoints &&
          balanceAfter >= 0,
        balanceBefore: before.totalGlowPoints,
        balanceAfter,
        attemptedCost,
      };
    });
  },
} as const;
