"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";
import {
  prepareVerseImport,
  VerseImportFileError,
} from "@/features/verses/lib/parse-verse-import";
import { verseRepository } from "@/features/verses/repositories/verse.repository";
import { importVersesInputSchema } from "@/features/verses/schemas/import-verses.schema";
import type { VerseImportPreview } from "@/features/verses/types/verse.types";

/** Validates and classifies a CSV import without making database changes. */
export async function previewVerseImportAction(
  input: unknown,
): Promise<ActionResult<VerseImportPreview>> {
  const parsed = importVersesInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid CSV file." };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }

  try {
    const references = await verseRepository.findAllReferences();
    const prepared = prepareVerseImport(parsed.data.csvText, references);
    return {
      success: true,
      message: "CSV preview ready.",
      data: prepared.preview,
    };
  } catch (error) {
    if (error instanceof VerseImportFileError) {
      return { success: false, message: error.message };
    }
    return { success: false, message: "Unable to preview this CSV file." };
  }
}
