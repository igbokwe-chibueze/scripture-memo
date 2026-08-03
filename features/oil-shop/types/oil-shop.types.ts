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
};

/** Safe result returned after an atomic purchase. */
export type OilShopPurchaseResult = {
  itemName: string;
  balance: number;
  hintsRemaining: number;
  purchasedHints: number;
};

export type OilShopConflictCode =
  | "ITEM_UNAVAILABLE"
  | "INSUFFICIENT_BALANCE"
  | "INVALID_ITEM_TYPE";
