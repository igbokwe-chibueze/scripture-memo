import { RewardEventType, type Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateHintBalance } from "@/features/hints/lib/hint-balance";
import { HINT_PACK_ITEM_TYPE } from "@/features/oil-shop/data/hint-shop-catalog";
import type {
  OilShopConflictCode,
  OilShopData,
  OilShopPurchaseResult,
} from "@/features/oil-shop/types/oil-shop.types";

const purchaseTransactionOptions = { maxWait: 10_000, timeout: 30_000 } as const;

/** Trusted purchase conflict mapped to a concise learner-facing action result. */
export class OilShopConflictError extends Error {
  constructor(readonly code: OilShopConflictCode) {
    super(code);
    this.name = "OilShopConflictError";
  }
}

/** Sums immutable entitlement snapshots rather than mutable current product data. */
async function getPurchasedHintTotal(
  client: Prisma.TransactionClient | typeof prisma,
  userId: string,
): Promise<number> {
  const result = await client.userShopPurchase.aggregate({
    where: { userId, shopItem: { itemType: HINT_PACK_ITEM_TYPE } },
    _sum: { entitlementQuantity: true },
  });
  return result._sum.entitlementQuantity ?? 0;
}

/** Database boundary for the learner shop catalogue, inventory, and purchases. */
export const oilShopRepository = {
  /** Returns active hint products and the learner's server-derived balances. */
  async getShopData(userId: string): Promise<OilShopData> {
    const [profile, items, usedHints, purchasedHints] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId },
        select: { totalGlowPoints: true },
      }),
      prisma.shopItem.findMany({
        where: { isActive: true, itemType: HINT_PACK_ITEM_TYPE },
        orderBy: [{ cost: "asc" }, { name: "asc" }],
        select: { id: true, name: true, description: true, cost: true, grantQuantity: true },
      }),
      prisma.hintUsage.count({ where: { userId } }),
      getPurchasedHintTotal(prisma, userId),
    ]);

    return {
      balance: profile?.totalGlowPoints ?? 0,
      hintsRemaining: calculateHintBalance(usedHints, purchasedHints),
      purchasedHints,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        cost: item.cost,
        hintQuantity: item.grantQuantity,
      })),
    };
  },

  /**
   * Atomically deducts Glow Points and grants a durable hint entitlement.
   *
   * WHY: The advisory lock serializes purchases for one learner. The guarded
   * balance update, purchase snapshot, and negative immutable ledger row share
   * one transaction, making partial inventory or negative balances impossible.
   */
  async purchaseItem(
    userId: string,
    itemId: string,
    idempotencyKey: string,
  ): Promise<OilShopPurchaseResult> {
    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-shop'), hashtext(${userId}))`;

      const prior = await transaction.userShopPurchase.findUnique({
        where: { idempotencyKey },
        include: { shopItem: { select: { name: true } } },
      });
      if (prior) {
        if (prior.userId !== userId || prior.shopItemId !== itemId) {
          throw new OilShopConflictError("ITEM_UNAVAILABLE");
        }
        const [profile, usedHints, purchasedHints] = await Promise.all([
          transaction.userProfile.findUnique({ where: { userId }, select: { totalGlowPoints: true } }),
          transaction.hintUsage.count({ where: { userId } }),
          getPurchasedHintTotal(transaction, userId),
        ]);
        return {
          itemName: prior.shopItem.name,
          balance: profile?.totalGlowPoints ?? 0,
          hintsRemaining: calculateHintBalance(usedHints, purchasedHints),
          purchasedHints,
        };
      }

      const item = await transaction.shopItem.findFirst({
        where: { id: itemId, isActive: true },
        select: { id: true, name: true, itemType: true, cost: true, grantQuantity: true },
      });
      if (!item) throw new OilShopConflictError("ITEM_UNAVAILABLE");
      if (item.itemType !== HINT_PACK_ITEM_TYPE || item.grantQuantity <= 0) {
        throw new OilShopConflictError("INVALID_ITEM_TYPE");
      }

      const deducted = await transaction.userProfile.updateMany({
        where: { userId, totalGlowPoints: { gte: item.cost } },
        data: { totalGlowPoints: { decrement: item.cost } },
      });
      if (deducted.count !== 1) throw new OilShopConflictError("INSUFFICIENT_BALANCE");

      await transaction.userShopPurchase.create({
        data: {
          userId,
          shopItemId: item.id,
          quantity: 1,
          unitCost: item.cost,
          totalCost: item.cost,
          entitlementQuantity: item.grantQuantity,
          idempotencyKey,
        },
      });
      await transaction.rewardLedger.create({
        data: {
          userId,
          amount: -item.cost,
          eventType: RewardEventType.SHOP_PURCHASE,
          reason: `Purchased ${item.name}`,
          idempotencyKey: `shop:${idempotencyKey}`,
        },
      });

      const [profile, usedHints, purchasedHints] = await Promise.all([
        transaction.userProfile.findUnique({ where: { userId }, select: { totalGlowPoints: true } }),
        transaction.hintUsage.count({ where: { userId } }),
        getPurchasedHintTotal(transaction, userId),
      ]);
      return {
        itemName: item.name,
        balance: profile?.totalGlowPoints ?? 0,
        hintsRemaining: calculateHintBalance(usedHints, purchasedHints),
        purchasedHints,
      };
    }, purchaseTransactionOptions);
  },
} as const;
