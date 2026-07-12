"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { logger } from "@/lib/logger";
import { isAdmin } from "@/lib/permissions";
import type { ActionResult } from "@/types/api";
import {
  prepareVerseImport,
  VerseImportFileError,
} from "@/features/verses/lib/parse-verse-import";
import { verseRepository } from "@/features/verses/repositories/verse.repository";
import { importVersesInputSchema } from "@/features/verses/schemas/import-verses.schema";
import type { VerseImportResult } from "@/features/verses/types/verse.types";

function getRequestIp(requestHeaders: Headers): string | null {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || requestHeaders.get("x-real-ip")?.trim();
  return address ? address.slice(0, 64) : null;
}

/** Revalidates and atomically imports every ready CSV row for an administrator. */
export async function importVersesAction(
  input: unknown,
): Promise<ActionResult<VerseImportResult>> {
  const parsed = importVersesInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid CSV file." };
  }

  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }

  try {
    // WHY: Confirmation re-runs parsing and duplicate checks because database
    // state may have changed after preview. The client preview is informative,
    // never authoritative over which records are safe to create.
    const references = await verseRepository.findAllReferences();
    const prepared = prepareVerseImport(parsed.data.csvText, references);
    if (prepared.readyRows.length === 0) {
      return {
        success: false,
        message: "No importable verses remain after duplicate and validation checks.",
      };
    }

    const importedCount = await verseRepository.importMany(
      prepared.readyRows,
      session.user.id,
      getRequestIp(requestHeaders),
      prepared.preview.duplicateCount,
      prepared.preview.invalidCount,
    );
    revalidatePath("/admin/verses");

    return {
      success: true,
      message: `${importedCount} ${importedCount === 1 ? "verse" : "verses"} imported.`,
      data: {
        importedCount,
        duplicateCount: prepared.preview.duplicateCount,
        invalidCount: prepared.preview.invalidCount,
      },
    };
  } catch (error) {
    if (error instanceof VerseImportFileError) {
      return { success: false, message: error.message };
    }
    logger.error("Bulk verse import failed.", { error, actorId: session.user.id });
    return {
      success: false,
      message: "The import could not be completed. No verses were added.",
    };
  }
}
