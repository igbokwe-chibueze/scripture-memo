"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { sanctuaryRepository } from "@/features/sanctuary/repositories/sanctuary.repository";
import { saveSanctuaryNoteSchema } from "@/features/sanctuary/schemas/sanctuary.schema";

/** Saves one private note after validation, authentication, and access proof. */
export async function saveSanctuaryNoteAction(input: unknown): Promise<ActionResult> {
  const parsed = saveSanctuaryNoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Review your note.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };

  try {
    const saved = await sanctuaryRepository.saveNote(
      session.user.id,
      parsed.data.verseId,
      parsed.data.content,
    );
    if (!saved) return { success: false, message: "This verse is not available in your Sanctuary." };
    revalidatePath(`/sanctuary/${parsed.data.verseId}`);
    return { success: true, message: "Private note saved." };
  } catch (error) {
    logger.error("Unable to save Sanctuary note.", { error, userId: session.user.id });
    return { success: false, message: "Your note could not be saved." };
  }
}
