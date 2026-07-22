"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { AppErrorCode } from "@/lib/errors/error-catalog";
import type { ActionResult } from "@/types/api";
import { gameplayRepository } from "@/features/gameplay/repositories/gameplay.repository";
import { startGameSessionSchema } from "@/features/gameplay/schemas/start-game-session.schema";
import { ProgressionConflictError } from "@/features/progression/repositories/progression.repository";

/** Maps trusted progression conflicts to stable, security-safe catalogue codes. */
function getProgressionError(error: ProgressionConflictError): {
  message: string;
  errorCode: AppErrorCode;
} {
  switch (error.code) {
    case "WAYPOINT_UNAVAILABLE":
      return { message: "This waypoint is no longer available for play.", errorCode: "PRG-003" };
    case "WAYPOINT_LOCKED":
      return { message: "Complete the preceding waypoint before starting this one.", errorCode: "PRG-002" };
    case "DAY_COOLDOWN_ACTIVE":
      return { message: "This challenge day is not unlocked yet.", errorCode: "PRG-004" };
    case "PREVIOUS_DAY_INCOMPLETE":
      return { message: "Complete the previous challenge day first.", errorCode: "PRG-005" };
    case "DAY_ALREADY_COMPLETED":
      return { message: "This challenge day has already been completed.", errorCode: "PRG-006" };
    case "DAY_NOT_INITIALIZED":
      return { message: "This challenge day is not ready yet.", errorCode: "PRG-007" };
    default:
      return { message: "Your progression could not be updated.", errorCode: "PRG-008" };
  }
}

/** Validates, authorizes, and atomically starts or resumes one challenge day. */
export async function startGameSessionAction(
  input: unknown,
): Promise<ActionResult<{ sessionId: string; redirectTo: string }>> {
  const parsed = startGameSessionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid challenge selection.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }

  try {
    const gameSession = await gameplayRepository.startSession(
      session.user.id,
      parsed.data.waypointId,
      parsed.data.dayLevel,
      new Date(),
    );
    const redirectTo = `/game/sessions/${gameSession.id}`;
    revalidatePath(`/game/waypoints/${parsed.data.waypointId}`);
    revalidatePath("/game/map");
    return {
      success: true,
      message: "Challenge ready.",
      data: { sessionId: gameSession.id, redirectTo },
    };
  } catch (error) {
    if (error instanceof ProgressionConflictError) {
      return { success: false, ...getProgressionError(error) };
    }

    logger.error("Unable to start gameplay session.", {
      error,
      userId: session.user.id,
      waypointId: parsed.data.waypointId,
      dayLevel: parsed.data.dayLevel,
    });
    return {
      success: false,
      message: "The challenge could not be started. Please try again.",
      errorCode: "PRG-008",
    };
  }
}
