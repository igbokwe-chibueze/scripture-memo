"use server";

/** Every callable entry point validates first and independently authenticates before private/upstream reads. */
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";
import type { AppErrorCode } from "@/lib/errors/error-catalog";
import { logger } from "@/lib/logger";
import {
  bibleMarkSchema,
  bibleReferenceSchema,
  bibleSavedSchema,
  bibleSearchSchema,
  bibleStudySchema,
  biblePassageSaveSchema,
  bibleItemTagsSchema,
} from "../schemas/bible.schema";
import { bibleRepository } from "../repositories/bible.repository";
import {
  loadBibleChapter,
  loadBibleLexicon,
  loadBibleStudy,
  searchBibleText,
} from "../lib/bible-provider";
import type {
  BibleChapter,
  BibleLexicon,
  BibleMark,
  BibleSearchHit,
  BibleStudy,
} from "../types/bible.types";

/** Narrow common guard keeps all entry points safe, including direct forged POST requests. */
async function authorized<T>(
  valid: boolean,
  work: (userId: string) => Promise<T>,
  errorCode: AppErrorCode = "BIB-001",
): Promise<ActionResult<T>> {
  const t = await getTranslations("Bible");
  if (!valid) return { success: false, message: t("invalid") };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: t("authRequired") };
  try {
    return {
      success: true,
      message: t("done"),
      data: await work(session.user.id),
    };
  } catch (error) {
    // Diagnostics stay server-only and pass through the shared redacting
    // logger. The browser receives only the safe message and stable code.
    logger.error("Bible resource request failed", { errorCode, error });
    return { success: false, message: t("failed"), errorCode };
  }
}

/** Audio-only fallback reads public provider data, never private marks or progress.
 * This is called only after explicit BSB consent, avoiding an extra DB query.
 */
export async function readBibleAudioAction(
  input: unknown,
): Promise<ActionResult<Record<string, string>>> {
  const parsed = bibleReferenceSchema.safeParse(input);
  return authorized(parsed.success, async () => {
    if (!parsed.success) throw new Error("Invalid reference.");
    return (await loadBibleChapter(parsed.data)).audio;
  });
}

/** Chapter and private marks load together with no read-time initialization or mutations. */
export async function readBibleChapterAction(
  input: unknown,
): Promise<ActionResult<{ chapter: BibleChapter; marks: BibleMark[] }>> {
  const parsed = bibleReferenceSchema.safeParse(input);
  return authorized(parsed.success, async (userId) => {
    if (!parsed.success) throw new Error("Invalid reference.");
    const [chapter, marks] = await Promise.all([
      loadBibleChapter(parsed.data),
      bibleRepository.chapterMarks(userId, parsed.data),
    ]);
    return { chapter, marks };
  });
}

/** Writes desired state without accepting any client-owned identity or Bible text. */
export async function setBibleMarkAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = bibleMarkSchema.safeParse(input);
  return authorized(
    parsed.success,
    async (userId) => {
      if (!parsed.success) throw new Error("Invalid mark.");
      await bibleRepository.setMark(userId, parsed.data);
      // Marks are uncached, owner-private action reads. The reader updates its
      // loaded marks after success and Saved reads fresh on entry; refreshing
      // the entire route here needlessly rebuilds the reading UI and can move
      // its scroll position while a highlight is being applied.
      return null;
    },
    "BIB-002",
  );
}

/** Study calls never write learner progress, annotations or rewards. */
export async function readBibleStudyAction(
  input: unknown,
): Promise<ActionResult<BibleStudy | null>> {
  const parsed = bibleStudySchema.safeParse(input);
  return authorized(parsed.success, async () => {
    if (!parsed.success) throw new Error("Invalid study.");
    return loadBibleStudy(parsed.data, parsed.data.tab, parsed.data.commentary);
  });
}

/** A restricted Strong's identifier is the only accepted lexicon lookup key. */
export async function readBibleLexiconAction(
  input: unknown,
): Promise<ActionResult<BibleLexicon | null>> {
  const parsed = z
    .string()
    .regex(/^[HG]\d{4,5}[a-z]?$/)
    .safeParse(input);
  return authorized(parsed.success, async () => {
    if (!parsed.success) throw new Error("Invalid lexicon identifier.");
    return loadBibleLexicon(parsed.data);
  });
}

/** Searches public licensed text in a bounded shared index, not the private curriculum database. */
export async function searchBibleAction(
  input: unknown,
): Promise<ActionResult<{ hits: BibleSearchHit[]; total: number }>> {
  const parsed = bibleSearchSchema.safeParse(input);
  return authorized(parsed.success, async () => {
    if (!parsed.success) throw new Error("Invalid search.");
    return searchBibleText(
      parsed.data.q,
      parsed.data.translation,
      parsed.data.page,
    );
  });
}

/** Explicit grouped saves/removals never trust a client-supplied account ID. */
export async function setBiblePassageAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = biblePassageSaveSchema.safeParse(input);
  return authorized(
    parsed.success,
    async (userId) => {
      if (!parsed.success) throw new Error("Invalid passage.");
      await bibleRepository.setPassage(userId, parsed.data);
      revalidatePath("/bible");
      return null;
    },
    "BIB-002",
  );
}

/** Separate bookmark/highlight library, always scoped to the authenticated owner. */
export async function readSavedBibleAction(
  input: unknown,
): Promise<ActionResult<{ marks: BibleMark[]; hasNext: boolean }>> {
  const parsed = bibleSavedSchema.safeParse(input);
  return authorized(
    parsed.success,
    async (userId) => {
      if (!parsed.success) throw new Error("Invalid saved filter.");
      return bibleRepository.saved(userId, parsed.data);
    },
    "BIB-002",
  );
}

/** Explicit tag edits are validated and owner-scoped, with no read-before-write. */
export async function setBibleItemTagsAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = bibleItemTagsSchema.safeParse(input);
  return authorized(
    parsed.success,
    async (userId) => {
      if (!parsed.success) throw new Error("Invalid tags.");
      if (!(await bibleRepository.setTags(userId, parsed.data)))
        throw new Error("Saved item no longer exists.");
      return null;
    },
    "BIB-002",
  );
}

/** On-demand suggestions only; typing and selecting tags never write. */
export async function readBibleTagsAction(): Promise<ActionResult<string[]>> {
  return authorized(true, (userId) => bibleRepository.tags(userId), "BIB-002");
}

/** Save dialogs read one item's labels; opening a dialog never creates a save. */
export async function readBibleItemTagsAction(
  input: unknown,
): Promise<ActionResult<string[]>> {
  const parsed = bibleReferenceSchema.safeParse(input);
  return authorized(
    parsed.success,
    async (userId) => {
      if (!parsed.success) throw new Error("Invalid reference.");
      return bibleRepository.itemTags(userId, parsed.data);
    },
    "BIB-002",
  );
}
