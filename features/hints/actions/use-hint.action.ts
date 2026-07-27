"use server";

import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import {
  HintConflictError,
  hintRepository,
} from "@/features/hints/repositories/hint.repository";
import { useHintSchema } from "@/features/hints/schemas/use-hint.schema";
import type { UseHintResult } from "@/features/hints/types/hint.types";

/** Validates and authorizes one persisted hint consumption. */
export async function useHintAction(
  input: unknown,
): Promise<ActionResult<UseHintResult>> {
  const parsed = useHintSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid hint request.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  try {
    const result = await hintRepository.useHint(session.user.id, parsed.data.sessionId);
    return {
      success: true,
      message: `Hint used. ${result.remainingHints} hints remaining.`,
      data: result,
    };
  } catch (error) {
    if (error instanceof HintConflictError) {
      if (error.code === "STAGE_DISALLOWS_HINTS") {
        return { success: false, message: "Hints are unavailable at this Journey Stage." };
      }
      if (error.code === "NO_HINTS_REMAINING") {
        return { success: false, message: "You have no hints remaining." };
      }
      return { success: false, message: "This gameplay session is no longer available." };
    }
    logger.error("Unable to use gameplay hint.", {
      error,
      userId: session.user.id,
      sessionId: parsed.data.sessionId,
    });
    return { success: false, message: "The hint could not be used. Please try again." };
  }
}
