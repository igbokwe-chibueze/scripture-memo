"use server";

import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import type { ActionResult } from "@/types/api";
import { oilShopQaRepository } from "@/features/oil-shop/repositories/oil-shop-qa.repository";

/** Verifies the signed-in administrator's latest real Oil Shop purchase. */
export async function verifyOilShopPurchaseAction(): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }

  try {
    const result = await oilShopQaRepository.verifyLatestPurchase(
      session.user.id,
    );
    if (!result.verified || !result.itemName) {
      return {
        success: false,
        message: "Complete one hint-pack purchase before running this check.",
      };
    }

    return {
      success: true,
      message:
        `${result.itemName} verified: Glow ${result.balanceBefore} → ` +
        `${result.balanceAfter}; hints ${result.hintsBefore} → ` +
        `${result.hintsAfter}.`,
    };
  } catch (error) {
    logger.error("Oil Shop purchase QA verification failed.", {
      error,
      actorId: session.user.id,
    });
    return {
      success: false,
      message: "The latest purchase could not be verified.",
    };
  }
}
