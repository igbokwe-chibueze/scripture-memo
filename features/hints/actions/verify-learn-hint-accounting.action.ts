"use server";

import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import type { ActionResult } from "@/types/api";
import { hintQaRepository } from "@/features/hints/repositories/hint-qa.repository";
import { verifyHintQaSchema } from "@/features/hints/schemas/verify-hint-qa.schema";

/** Verifies one real Learn hint without consuming another hint. */
export async function verifyLearnHintAccountingAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = verifyHintQaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid hint accounting test.",
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
    const verification = await hintQaRepository.verifyLearnHintAccounting(
      session.user.id,
      parsed.data.sessionId,
    );
    if (!verification.verified) {
      return {
        success: false,
        message: "Use one hint in the current Learn mode before verifying.",
      };
    }

    return {
      success: true,
      message: `One hint was recorded. ${verification.remainingHints} remain.`,
    };
  } catch (error) {
    logger.error("Unable to verify Learn hint accounting.", {
      error,
      actorId: session.user.id,
      sessionId: parsed.data.sessionId,
    });
    return {
      success: false,
      message: "Hint accounting could not be verified.",
    };
  }
}
