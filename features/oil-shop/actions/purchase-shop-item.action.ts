"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import {
  OilShopConflictError,
  oilShopRepository,
} from "@/features/oil-shop/repositories/oil-shop.repository";
import { purchaseShopItemSchema } from "@/features/oil-shop/schemas/purchase-shop-item.schema";
import type { OilShopPurchaseResult } from "@/features/oil-shop/types/oil-shop.types";

/** Purchases one server-defined item for the authenticated learner. */
export async function purchaseShopItemAction(
  input: unknown,
): Promise<ActionResult<OilShopPurchaseResult>> {
  const parsed = purchaseShopItemSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Review this purchase." };

  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  try {
    const purchase = await oilShopRepository.purchaseItem(
      session.user.id,
      parsed.data.itemId,
      parsed.data.idempotencyKey,
    );
    revalidatePath("/oil-shop");
    revalidatePath("/vault");
    return { success: true, message: `Purchased ${purchase.itemName}!`, data: purchase };
  } catch (error) {
    if (error instanceof OilShopConflictError) {
      if (error.code === "INSUFFICIENT_BALANCE") {
        return { success: false, message: "You need more Glow Points for this pack." };
      }
      return { success: false, message: "This item is no longer available." };
    }
    logger.error("Oil Shop purchase failed.", { error, userId: session.user.id });
    return { success: false, message: "The purchase could not be completed." };
  }
}
