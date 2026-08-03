import { z } from "zod";

/** Validates opaque identifiers before authentication or database access. */
export const purchaseShopItemSchema = z.object({
  itemId: z.string().cuid(),
  idempotencyKey: z.string().uuid(),
});
