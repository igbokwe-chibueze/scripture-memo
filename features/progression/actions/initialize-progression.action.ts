"use server";

import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";
import { progressionRepository } from "@/features/progression/repositories/progression.repository";
import { initializeProgressionSchema } from "@/features/progression/schemas/initialize-progression.schema";
import type { InitializeProgressionResult } from "@/features/progression/types/progression.types";

/** Idempotently repairs or initializes progression for the signed-in learner. */
export async function initializeProgressionAction(
  input: unknown,
): Promise<ActionResult<InitializeProgressionResult>> {
  const parsed = initializeProgressionSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid request." };

  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  try {
    const result = await progressionRepository.initializeFirstWaypoint(session.user.id);
    if (result.status === "curriculum-unavailable") {
      return {
        success: false,
        message: "No playable waypoint is currently available.",
        errorCode: "PRG-001",
      };
    }
    return { success: true, message: "Your journey is ready.", data: result };
  } catch {
    return {
      success: false,
      message: "Your journey could not be prepared.",
      errorCode: "PRG-008",
    };
  }
}
