import type { ActionResult } from "@/types/api";
import type { OilShopPurchaseResult } from "./oil-shop.types";

/** Client callbacks bound by production or QA, never accepted by a server API. */
export type OilShopTransport = {
  purchase: (input: {
    itemId: string;
    idempotencyKey: string;
  }) => Promise<ActionResult<OilShopPurchaseResult>>;
  verifyPurchase: () => Promise<ActionResult>;
  verifyBalance: () => Promise<ActionResult>;
};
