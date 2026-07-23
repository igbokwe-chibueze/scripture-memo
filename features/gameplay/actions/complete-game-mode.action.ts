"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import {
  GameplayConflictError,
  gameplayRepository,
} from "@/features/gameplay/repositories/gameplay.repository";
import { completeGameModeSchema } from "@/features/gameplay/schemas/complete-game-mode.schema";
import type { CompleteModeResult } from "@/features/gameplay/types/game-session.types";

/** Converts a trusted repository conflict into its safe public contract. */
function getCompletionConflict(error: GameplayConflictError): {
  message: string;
  errorCode: "GME-001" | "GME-002" | "GME-003";
} {
  if (error.code === "SESSION_UNAVAILABLE") {
    return { message: "This gameplay session is no longer available.", errorCode: "GME-001" };
  }
  if (error.code === "ATTEMPT_NOT_ACTIVE") {
    return { message: "This attempt has ended. Start a new attempt.", errorCode: "GME-003" };
  }
  return { message: "Complete the current game mode before continuing.", errorCode: "GME-002" };
}

/**
 * Submits answer evidence while the server owns timing and correctness checks.
 *
 * No completion, score, duration, stage, or reward value is accepted from the
 * browser. This action exposes only the transaction's verified outcome.
 */
export async function completeGameModeAction(
  input: unknown,
): Promise<ActionResult<CompleteModeResult>> {
  const parsed = completeGameModeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid game mode submission.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }

  try {
    const result = await gameplayRepository.completeModeAttempt(
      session.user.id,
      parsed.data.sessionId,
      parsed.data.attemptId,
      parsed.data.gameMode,
      parsed.data.submittedAnswer,
      new Date(),
    );
    if (result.status === "expired") {
      return {
        success: false,
        message: "Time expired for this attempt. Try the mode again.",
        errorCode: "GME-004",
      };
    }
    if (result.status === "incorrect") {
      return {
        success: false,
        message: "The verse is not fully correct yet. Try again.",
        errorCode: "GME-005",
      };
    }

    revalidatePath(`/game/sessions/${parsed.data.sessionId}`);
    if (result.status === "day-complete") {
      revalidatePath("/game/map");
    }
    return {
      success: true,
      message: result.status === "day-complete" ? "Challenge day complete!" : "Mode complete!",
      data: result,
    };
  } catch (error) {
    if (error instanceof GameplayConflictError) {
      return { success: false, ...getCompletionConflict(error) };
    }
    logger.error("Unable to complete game mode.", {
      error,
      userId: session.user.id,
      sessionId: parsed.data.sessionId,
      gameMode: parsed.data.gameMode,
    });
    return {
      success: false,
      message: "Gameplay could not be updated.",
      errorCode: "GME-006",
    };
  }
}
