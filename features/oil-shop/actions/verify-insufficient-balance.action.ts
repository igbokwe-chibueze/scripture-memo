"use server";

import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import type { ActionResult } from "@/types/api";
import { oilShopQaRepository } from "@/features/oil-shop/repositories/oil-shop-qa.repository";

/** Safely proves that an unaffordable purchase cannot make Glow negative. */
export async function verifyInsufficientBalanceAction(): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }

  try {
    const result = await oilShopQaRepository.verifyInsufficientBalanceGuard(
      session.user.id,
    );
    if (!result.protected) {
      logger.error("Oil Shop insufficient-balance guard verification failed.", {
        actorId: session.user.id,
        result,
      });
      return {
        success: false,
        message: "The insufficient-balance guard could not be verified.",
      };
    }

    return {
      success: true,
      message:
        `Blocked ${result.attemptedCost} Glow against a ` +
        `${result.balanceBefore} balance; balance remained unchanged.`,
    };
  } catch (error) {
    logger.error("Oil Shop insufficient-balance QA probe failed.", {
      error,
      actorId: session.user.id,
    });
    return {
      success: false,
      message: "The insufficient-balance guard could not be verified.",
    };
  }
}
