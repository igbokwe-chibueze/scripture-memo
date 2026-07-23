"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import {
  GameplayConflictError,
  gameplayRepository,
} from "@/features/gameplay/repositories/gameplay.repository";
import { startGameModeSchema } from "@/features/gameplay/schemas/start-game-mode.schema";
import type { GameModeAttemptData } from "@/features/gameplay/types/game-session.types";

/** Converts trusted attempt-order conflicts into stable public error codes. */
function getStartConflict(error: GameplayConflictError): {
  message: string;
  errorCode: "GME-001" | "GME-002";
} {
  return error.code === "SESSION_UNAVAILABLE"
    ? { message: "This gameplay session is no longer available.", errorCode: "GME-001" }
    : { message: "Complete the current game mode before continuing.", errorCode: "GME-002" };
}

/** Validates ownership and order before creating a server-timed mode attempt. */
export async function startGameModeAction(
  input: unknown,
): Promise<ActionResult<GameModeAttemptData>> {
  const parsed = startGameModeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid game mode request.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }

  try {
    const attempt = await gameplayRepository.startModeAttempt(
      session.user.id,
      parsed.data.sessionId,
      parsed.data.gameMode,
      new Date(),
    );
    revalidatePath(`/game/sessions/${parsed.data.sessionId}`);
    return { success: true, message: "Mode started.", data: attempt };
  } catch (error) {
    if (error instanceof GameplayConflictError) {
      return { success: false, ...getStartConflict(error) };
    }
    logger.error("Unable to start game mode.", {
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
