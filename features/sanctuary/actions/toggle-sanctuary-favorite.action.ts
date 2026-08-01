"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { sanctuaryRepository } from "@/features/sanctuary/repositories/sanctuary.repository";
import { toggleSanctuaryFavoriteSchema } from "@/features/sanctuary/schemas/sanctuary.schema";

/** Toggles one private favorite after server-owned progress authorization. */
export async function toggleSanctuaryFavoriteAction(
  input: unknown,
): Promise<ActionResult<{ isFavorite: boolean }>> {
  const parsed = toggleSanctuaryFavoriteSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid favorite request." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  try {
    const isFavorite = await sanctuaryRepository.toggleFavorite(
      session.user.id,
      parsed.data.verseId,
    );
    if (isFavorite === null) {
      return { success: false, message: "This verse is not available in your Sanctuary." };
    }
    revalidatePath(`/sanctuary/${parsed.data.verseId}`);
    revalidatePath("/vault");
    return {
      success: true,
      message: isFavorite ? "Added to favorites." : "Removed from favorites.",
      data: { isFavorite },
    };
  } catch (error) {
    logger.error("Unable to toggle Sanctuary favorite.", {
      error,
      userId: session.user.id,
    });
    return { success: false, message: "Favorite could not be updated." };
  }
}
