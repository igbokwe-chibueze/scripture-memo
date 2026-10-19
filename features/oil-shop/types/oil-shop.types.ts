import type { AvatarKey } from "@/features/profile/data/avatar-catalog";

/** A server-authorized consumable displayed in the Oil Shop. */
export type OilShopItem = {
  id: string;
  name: string;
  description: string;
  cost: number;
  hintQuantity: number;
};

/** Complete private shop state for one authenticated learner. */
export type OilShopData = {
  balance: number;
  hintsRemaining: number;
  purchasedHints: number;
  items: OilShopItem[];
  avatars: ShopAvatarItem[];
  equippedAvatarKey: AvatarKey;
};

/** Cosmetic prices/ownership come from the authorized shop read, never the browser. */
export type ShopAvatarItem = {
  id: string;
  avatarKey: AvatarKey;
  cost: number;
  owned: boolean;
};

/** Safe result returned after an atomic purchase. */
export type OilShopPurchaseResult = {
  itemName: string;
  balance: number;
  hintsRemaining: number;
  purchasedHints: number;
  avatarKey?: AvatarKey;
};

export type OilShopConflictCode =
  | "ITEM_UNAVAILABLE"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_ITEM_TYPE";
