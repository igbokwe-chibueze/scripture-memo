"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { progressionRepository } from "@/features/progression/repositories/progression.repository";
import { overrideCooldownSchema } from "@/features/progression/schemas/override-cooldown.schema";

/**
 * Lets an administrator bypass only their own active cooldown for product
 * testing. Validation and authorization are repeated server-side because a
 * hidden client control is not a security boundary.
 */
export async function overrideCooldownAction(input: unknown): Promise<ActionResult> {
  const parsed = overrideCooldownSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Invalid cooldown selection.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }

  try {
    const requestHeaders = await headers();
    const result = await progressionRepository.overrideOwnCooldown(
      session.user.id,
      parsed.data.waypointId,
      parsed.data.dayLevel,
      session.user.id,
      getRequestIp(requestHeaders),
      new Date(),
    );
    if (result.status === "unavailable") {
      return {
        success: false,
        message: "This cooldown is not available for an administrator override.",
      };
    }

    revalidatePath(`/game/waypoints/${parsed.data.waypointId}`);
    revalidatePath("/game/map");
    return {
      success: true,
      message:
        result.status === "overridden"
          ? `${parsed.data.dayLevel === "GLOW" ? "Glow" : "Radiance"} unlocked for testing.`
          : "This challenge is already ready.",
    };
  } catch (error) {
    logger.error("Unable to override administrator cooldown.", {
      error,
      actorId: session.user.id,
      waypointId: parsed.data.waypointId,
      dayLevel: parsed.data.dayLevel,
    });
    return {
      success: false,
      message: "The cooldown could not be overridden. Please try again.",
      errorCode: "PRG-008",
    };
  }
}
