"use server";

import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import type { ActionResult } from "@/types/api";
import { gameplayQaRepository } from "@/features/gameplay/repositories/gameplay-qa.repository";
import { verifyCompletionIdempotencySchema } from "@/features/gameplay/schemas/verify-completion-idempotency.schema";

/**
 * Runs the rollback-only duplicate-completion probe for the signed-in admin.
 * Identity is always derived from the server session; an administrator cannot
 * use this diagnostic action to inspect or mutate another learner's account.
 */
export async function verifyCompletionIdempotencyAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = verifyCompletionIdempotencySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid completed challenge selection.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }

  try {
    const verification = await gameplayQaRepository.verifyCompletionIdempotency(
      session.user.id,
      parsed.data.waypointId,
      parsed.data.dayLevel,
    );
    if (!verification.protected) {
      logger.error("Duplicate completion protection verification failed.", {
        actorId: session.user.id,
        waypointId: parsed.data.waypointId,
        dayLevel: parsed.data.dayLevel,
        verification,
      });
      return {
        success: false,
        message: "Duplicate protection could not be verified.",
        errorCode: "PRG-008",
      };
    }

    return {
      success: true,
      message: "Duplicate rewards are protected and balances were unchanged.",
    };
  } catch (error) {
    logger.error("Unable to verify duplicate completion protection.", {
      error,
      actorId: session.user.id,
      waypointId: parsed.data.waypointId,
      dayLevel: parsed.data.dayLevel,
    });
    return {
      success: false,
      message: "Duplicate protection could not be verified.",
      errorCode: "PRG-008",
    };
  }
}

