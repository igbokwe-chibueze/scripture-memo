"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/permissions";
import type { TranslationCode, UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import { verseRepository } from "@/features/verses/repositories/verse.repository";
import { upsertTranslationSchema } from "@/features/verses/schemas/verse.schema";

/** Updates translation text and regenerates its comparison-safe normalized text. */
export async function updateTranslationAction(input: unknown): Promise<ActionResult> {
  const parsed = upsertTranslationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid translation." };
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };
  try {
    await verseRepository.upsertTranslation(parsed.data.verseId, parsed.data.translation as TranslationCode, parsed.data.text);
    revalidatePath(`/admin/verses/${parsed.data.verseId}/edit`);
    return { success: true, message: "Translation updated." };
  } catch {
    return { success: false, message: "Unable to update translation." };
  }
}
