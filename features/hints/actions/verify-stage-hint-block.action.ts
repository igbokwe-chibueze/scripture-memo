"use server";

import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import type { ActionResult } from "@/types/api";
import {
  HintConflictError,
  hintRepository,
} from "@/features/hints/repositories/hint.repository";
import { verifyHintQaSchema } from "@/features/hints/schemas/verify-hint-qa.schema";

/** Calls the real hint gate for an isolated administrator test session. */
export async function verifyStageHintBlockAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = verifyHintQaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid blocked-hint test.",
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
    await hintRepository.verifyAdminTestStageBlock(
      session.user.id,
      parsed.data.sessionId,
    );
    return {
      success: false,
      message: "The server did not reject this hint request.",
    };
  } catch (error) {
    if (
      error instanceof HintConflictError &&
      error.code === "STAGE_DISALLOWS_HINTS"
    ) {
      return {
        success: true,
        message: "Server correctly blocked hints for this Journey Stage.",
      };
    }

    logger.error("Unable to verify the Journey Stage hint gate.", {
      error,
      actorId: session.user.id,
      sessionId: parsed.data.sessionId,
    });
    return {
      success: false,
      message: "The Journey Stage hint gate could not be verified.",
    };
  }
}
