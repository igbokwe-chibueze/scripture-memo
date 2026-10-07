"use server";

import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { mapRepository } from "@/features/map/repositories/map.repository";
import { setTrailArtworkSchema } from "@/features/map/schemas/set-trail-artwork.schema";

/** Assigns one built-in map illustration to a trail, or restores the default sequence. */
export async function setTrailArtworkAction(input: unknown): Promise<ActionResult> {
  const parsed = setTrailArtworkSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Choose a valid trail and map image." };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }

  try {
    await mapRepository.setTrailArtwork(
      parsed.data.trailNumber,
      parsed.data.themeId,
    );

    revalidatePath("/admin/map-trails");
    revalidatePath("/game/map");

    return {
      success: true,
      message: parsed.data.themeId
        ? `Trail ${parsed.data.trailNumber} artwork updated.`
        : `Trail ${parsed.data.trailNumber} will use the default artwork sequence.`,
    };
  } catch (error) {
    logger.error("Unable to save trail artwork.", {
      error,
      trailNumber: parsed.data.trailNumber,
      actorId: session.user.id,
    });
    return { success: false, message: "Trail artwork could not be updated." };
  }
}
