"use server";

import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import {
  GameplayConflictError,
  gameplayRepository,
} from "@/features/gameplay/repositories/gameplay.repository";
import { startAdminGameplayTestSchema } from "@/features/gameplay/schemas/start-admin-gameplay-test.schema";

/**
 * Creates an isolated, server-authoritative Journey Stage test session.
 *
 * This action is intentionally administrator-only even though its sessions
 * cannot award progress. It exposes unpublished curriculum content and creates
 * diagnostic database records, so a normal learner must never invoke it.
 */
export async function startAdminGameplayTestAction(
  input: unknown,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = startAdminGameplayTestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Choose an assigned waypoint and game mode.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getServerSession();
  if (
    !session?.user ||
    !isAdmin(session.user.role as UserRole | null | undefined)
  ) {
    return {
      success: false,
      message: "Administrator access is required.",
    };
  }

  try {
    const gameSession = await gameplayRepository.startAdminTestSession(
      session.user.id,
      parsed.data.waypointId,
      parsed.data.gameMode,
      new Date(),
    );

    return {
      success: true,
      message: "Admin test ready. Progress will not change.",
      data: {
        redirectTo: `/game/sessions/${gameSession.id}`,
      },
    };
  } catch (error) {
    if (error instanceof GameplayConflictError) {
      return {
        success: false,
        message: "This waypoint needs an assigned verse before it can be tested.",
      };
    }

    logger.error("Unable to create administrator gameplay test.", {
      error,
      userId: session.user.id,
      waypointId: parsed.data.waypointId,
      gameMode: parsed.data.gameMode,
    });
    return {
      success: false,
      message: "The admin test could not be started. Please try again.",
      errorCode: "GME-006",
    };
  }
}
