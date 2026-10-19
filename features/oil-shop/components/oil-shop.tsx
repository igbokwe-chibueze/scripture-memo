"use client";

import { OilShopContent } from "./oil-shop-content";
import { purchaseShopItemAction } from "../actions/purchase-shop-item.action";
import { verifyInsufficientBalanceAction } from "../actions/verify-insufficient-balance.action";
import { verifyOilShopPurchaseAction } from "../actions/verify-oil-shop-purchase.action";
import { equipShopAvatarAction } from "../actions/equip-shop-avatar.action";
import type { OilShopData } from "../types/oil-shop.types";
import type { OilShopTransport } from "../types/oil-shop-transport.types";

// Preserve the existing celebration import path and approved behavior.
export { PurchaseCelebrationDialog } from "./oil-shop-content";
export type { PurchaseCelebration } from "./oil-shop-content";

const transport: OilShopTransport = {
  purchase: purchaseShopItemAction,
  verifyPurchase: verifyOilShopPurchaseAction,
  verifyBalance: verifyInsufficientBalanceAction,
  equipAvatar: equipShopAvatarAction,
};

/** Production shop binds server-owned prices, authorization, and transactions. */
export function OilShop(props: {
  initialData: OilShopData;
  initialTab?: "hints" | "avatars" | "donations";
  isAdministrator?: boolean;
}): React.ReactNode {
  return <OilShopContent {...props} transport={transport} />;
}
