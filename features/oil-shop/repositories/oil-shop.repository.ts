/** Repository owns every shop read/write; clients never supply prices or grants. */
import { RewardEventType, type Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateHintBalance } from "@/features/hints/lib/hint-balance";
import { normalizeAvatarKey, isFreeAvatar, type AvatarKey } from "@/features/profile/data/avatar-catalog";
import { HINT_PACK_ITEM_TYPE } from "../data/hint-shop-catalog";
import { AVATAR_ITEM_TYPE, avatarKeyForSlug } from "../data/avatar-shop-catalog";
import type { OilShopConflictCode, OilShopData, OilShopPurchaseResult } from "../types/oil-shop.types";

type ShopClient = Prisma.TransactionClient | typeof prisma;
type ShopBalance = Pick<OilShopPurchaseResult, "balance" | "hintsRemaining" | "purchasedHints">;
const purchaseTransactionOptions = { maxWait: 10_000, timeout: 30_000 } as const;

/** Trusted conflicts expose safe learner-facing errors without raw database details. */
export class OilShopConflictError extends Error {
  constructor(readonly code: OilShopConflictCode) {
    super(code);
    this.name = "OilShopConflictError";
  }
}

/** Sum historical snapshots, including retired packs; avatar grants never count as hints. */
async function getPurchasedHintTotal(client: ShopClient, userId: string): Promise<number> {
  const result = await client.userShopPurchase.aggregate({
    where: { userId, shopItem: { itemType: HINT_PACK_ITEM_TYPE } },
    _sum: { entitlementQuantity: true },
  });
  return result._sum.entitlementQuantity ?? 0;
}

/** Produce the same authoritative balance shape for a new purchase or a safe retry. */
async function getPurchaseBalance(client: ShopClient, userId: string): Promise<ShopBalance> {
  const [profile, usedHints, purchasedHints] = await Promise.all([
    client.userProfile.findUnique({
      where: { userId },
      select: { totalGlowPoints: true, startingHintAllowance: true },
    }),
    client.hintUsage.count({ where: { userId } }),
    getPurchasedHintTotal(client, userId),
  ]);
  return {
    balance: profile?.totalGlowPoints ?? 0,
    hintsRemaining: calculateHintBalance(usedHints, purchasedHints, profile?.startingHintAllowance),
    purchasedHints,
  };
}

/** Database boundary for authorized catalogue, permanent ownership and currency integrity. */
export const oilShopRepository = {
  /** Five bounded reads per visit, no initialization, locks, polling or per-item queries. */
  async getShopData(userId: string): Promise<OilShopData> {
    const [profile, items, usedHints, purchasedHints, ownership] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId },
        select: { totalGlowPoints: true, startingHintAllowance: true, avatarKey: true },
      }),
      prisma.shopItem.findMany({
        where: {
          isActive: true,
          itemType: { in: [HINT_PACK_ITEM_TYPE, AVATAR_ITEM_TYPE] },
        },
        orderBy: [{ cost: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          itemType: true,
          description: true,
          cost: true,
          grantQuantity: true,
        },
      }),
      prisma.hintUsage.count({ where: { userId } }),
      getPurchasedHintTotal(prisma, userId),
      prisma.userAvatarOwnership.findMany({
        where: { userId },
        select: { avatarKey: true },
      }),
    ]);
    const ownedKeys = new Set(ownership.map((owned) => owned.avatarKey));

    return {
      balance: profile?.totalGlowPoints ?? 0,
      hintsRemaining: calculateHintBalance(usedHints, purchasedHints, profile?.startingHintAllowance),
      purchasedHints,
      equippedAvatarKey: normalizeAvatarKey(profile?.avatarKey),
      avatars: items.flatMap((item) => {
        const avatarKey = item.itemType === AVATAR_ITEM_TYPE
          ? avatarKeyForSlug(item.slug) : undefined;
        return avatarKey ? [{
          id: item.id,
          avatarKey,
          cost: item.cost,
          owned: ownedKeys.has(avatarKey),
        }] : [];
      }),
      items: items
        .filter((item) => item.itemType === HINT_PACK_ITEM_TYPE)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          cost: item.cost,
          hintQuantity: item.grantQuantity,
        })),
    };
  },

  /**
   * One per-user lock serializes retries, repeated cosmetic requests, and purchases.
   * Balance debit, immutable purchase/ledger and cosmetic ownership commit together.
   * A conditional debit prevents negative balances even against other balance writers.
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
        select: {
          userId: true,
          shopItemId: true,
          shopItem: { select: { name: true, slug: true, itemType: true } },
        },
      });
      if (prior) {
        if (prior.userId !== userId || prior.shopItemId !== itemId) {
          throw new OilShopConflictError("ITEM_UNAVAILABLE");
        }
        return {
          ...await getPurchaseBalance(transaction, userId),
          itemName: prior.shopItem.name,
          avatarKey: prior.shopItem.itemType === AVATAR_ITEM_TYPE
            ? avatarKeyForSlug(prior.shopItem.slug) : undefined,
        };
      }

      const item = await transaction.shopItem.findFirst({
        where: { id: itemId, isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          itemType: true,
          cost: true,
          grantQuantity: true,
        },
      });
      if (!item) throw new OilShopConflictError("ITEM_UNAVAILABLE");
      const avatarKey = item.itemType === AVATAR_ITEM_TYPE
        ? avatarKeyForSlug(item.slug) : undefined;
      if ((!avatarKey && item.itemType !== HINT_PACK_ITEM_TYPE) || item.grantQuantity <= 0 || item.cost < 0) {
        throw new OilShopConflictError("INVALID_ITEM_TYPE");
      }

      // Ownership is unique and permanent. A second request key for the same
      // portrait succeeds without another purchase, ledger entry or currency debit.
      if (avatarKey) {
        const owned = await transaction.userAvatarOwnership.findUnique({
          where: { userId_avatarKey: { userId, avatarKey } },
          select: { avatarKey: true },
        });
        if (owned) {
          return {
            ...await getPurchaseBalance(transaction, userId),
            itemName: item.name,
            avatarKey,
          };
        }
      }

      const deducted = await transaction.userProfile.updateMany({
        where: { userId, totalGlowPoints: { gte: item.cost } },
        data: { totalGlowPoints: { decrement: item.cost } },
      });
      if (deducted.count !== 1) throw new OilShopConflictError("INSUFFICIENT_BALANCE");
      const purchase = await transaction.userShopPurchase.create({
        data: {
          userId,
          shopItemId: item.id,
          quantity: 1,
          unitCost: item.cost,
          totalCost: item.cost,
          entitlementQuantity: item.grantQuantity,
          idempotencyKey,
        },
        select: { id: true },
      });
      if (avatarKey) {
        await transaction.userAvatarOwnership.create({
          data: { userId, avatarKey, purchaseId: purchase.id },
        });
      }
      await transaction.rewardLedger.create({
        data: {
          userId,
          amount: -item.cost,
          eventType: RewardEventType.SHOP_PURCHASE,
          reason: `Purchased ${item.name}`,
          idempotencyKey: `shop:${idempotencyKey}`,
        },
      });
      return {
        ...await getPurchaseBalance(transaction, userId),
        itemName: item.name,
        avatarKey,
      };
    }, purchaseTransactionOptions);
  },

  /** Permanent ownership makes a pre-write check safe; equipping never spends points. */
  async equipAvatar(userId: string, avatarKey: AvatarKey): Promise<void> {
    if (!isFreeAvatar(avatarKey)) {
      const owned = await prisma.userAvatarOwnership.findUnique({
        where: { userId_avatarKey: { userId, avatarKey } },
        select: { avatarKey: true },
      });
      if (!owned) throw new OilShopConflictError("ITEM_UNAVAILABLE");
    }
    await prisma.userProfile.update({ where: { userId }, data: { avatarKey } });
  },
} as const;
