"use server";

import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import type { ActionResult } from "@/types/api";
import { badgeQaRepository } from "@/features/badges/repositories/badge-qa.repository";
import { verifyFirstStepsBadgeSchema } from "@/features/badges/schemas/verify-first-steps-badge.schema";

/**
 * Verifies the signed-in administrator's existing First Steps badge history.
 *
 * The server session supplies learner identity so the diagnostic cannot be
 * used to inspect another account. The repository performs bounded reads only.
 */
export async function verifyFirstStepsBadgeAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = verifyFirstStepsBadgeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid completed Learn waypoint selection.",
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
    const verification = await badgeQaRepository.verifyFirstStepsBadge(
      session.user.id,
      parsed.data.waypointId,
    );
    if (!verification.verified) {
      logger.error("First Steps badge verification failed.", {
        actorId: session.user.id,
        waypointId: parsed.data.waypointId,
        verification,
      });
      return {
        success: false,
        message: "First Steps badge history could not be verified.",
      };
    }

    return {
      success: true,
      message: "First Steps unlocked once and its reward was recorded once.",
    };
  } catch (error) {
    logger.error("Unable to verify First Steps badge history.", {
      error,
      actorId: session.user.id,
      waypointId: parsed.data.waypointId,
    });
    return {
      success: false,
      message: "First Steps badge history could not be verified.",
    };
  }
}
