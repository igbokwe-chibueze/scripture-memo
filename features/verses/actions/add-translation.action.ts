"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/permissions";
import type { TranslationCode, UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import {
  VerseCurriculumConflictError,
  verseRepository,
} from "@/features/verses/repositories/verse.repository";
import { upsertTranslationSchema } from "@/features/verses/schemas/verse.schema";

/** Adds a missing translation while always generating normalization server-side. */
export async function addTranslationAction(input: unknown): Promise<ActionResult> {
  const parsed = upsertTranslationSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid translation." };
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) return { success: false, message: "Administrator access is required." };
  try {
    await verseRepository.upsertTranslation(parsed.data.verseId, parsed.data.translation as TranslationCode, parsed.data.text);
    revalidatePath(`/admin/verses/${parsed.data.verseId}/edit`);
    return { success: true, message: "Translation added." };
  } catch (error) {
    if (error instanceof VerseCurriculumConflictError) {
      return { success: false, message: "Learner history makes this verse content permanent." };
    }
    return { success: false, message: "Unable to add translation." };
  }
}
