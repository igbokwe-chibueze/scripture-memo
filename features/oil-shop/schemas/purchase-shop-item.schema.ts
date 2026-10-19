import { z } from "@/lib/zod";

/** Validates opaque identifiers before authentication or database access. */
export const purchaseShopItemSchema = z.object({
  // Catalogue migrations use stable opaque IDs; runtime/admin products may use CUIDs.
  itemId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  idempotencyKey: z.string().uuid(),
}).strict();
