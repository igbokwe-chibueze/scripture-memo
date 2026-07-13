import { z } from "zod";
import {
  formatBibleReference,
  getBibleChapterCount,
  getBibleVerseCount,
  isBibleBookName,
} from "@/features/verses/lib/bible-reference";

const translationTextSchema = z
  .string()
  .trim()
  .min(1, "Translation text is required.")
  .max(3000, "Translation text cannot exceed 3000 characters.");

/** Complete create/edit form contract for a verse and MVP translations. */
export const verseFormSchema = z
  .object({
    id: z.string().cuid().optional(),
    book: z
      .string()
      .refine(isBibleBookName, "Select a valid Bible book."),
    chapter: z.coerce.number().int().min(1).max(150),
    verseStart: z.coerce.number().int().min(1).max(176),
    verseEnd: z.union([z.literal(""), z.coerce.number().int().min(1).max(176)]),
    reflection: z.string().trim().max(3000).optional(),
    studyNote: z.string().trim().max(5000).optional(),
    tags: z.string().trim().max(500),
    isActive: z.boolean(),
    translations: z.object({
      NIV: translationTextSchema,
      ESV: translationTextSchema,
      KJV: translationTextSchema,
    }),
  })
  .superRefine((value, context) => {
    const chapterCount = getBibleChapterCount(value.book);
    if (chapterCount !== undefined && value.chapter > chapterCount) {
      context.addIssue({
        code: "custom",
        path: ["chapter"],
        message: `${value.book} has ${chapterCount} ${chapterCount === 1 ? "chapter" : "chapters"}.`,
      });
      return;
    }

    const verseCount = getBibleVerseCount(value.book, value.chapter);
    if (verseCount !== undefined && value.verseStart > verseCount) {
      context.addIssue({
        code: "custom",
        path: ["verseStart"],
        message: `${value.book} ${value.chapter} has ${verseCount} verses.`,
      });
    }
    if (verseCount !== undefined && value.verseEnd !== "" && value.verseEnd > verseCount) {
      context.addIssue({
        code: "custom",
        path: ["verseEnd"],
        message: `${value.book} ${value.chapter} has ${verseCount} verses.`,
      });
    }
    if (value.verseEnd !== "" && value.verseEnd < value.verseStart) {
      context.addIssue({
        code: "custom",
        path: ["verseEnd"],
        message: "Ending verse cannot precede the starting verse.",
      });
    }
  })
  .transform((value) => ({
    ...value,
    reference: formatBibleReference(
      value.book,
      value.chapter,
      value.verseStart,
      value.verseEnd,
    ),
  }));

export type VerseFormInput = z.input<typeof verseFormSchema>;
export type VerseFormValues = z.output<typeof verseFormSchema>;

export const verseIdSchema = z.object({ id: z.string().cuid() });

export const upsertTranslationSchema = z.object({
  verseId: z.string().cuid(),
  translation: z.enum(["NIV", "ESV", "KJV"]),
  text: translationTextSchema,
});

export const verseListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  search: z.string().trim().max(100).optional(),
  book: z.string().trim().max(60).optional(),
  tag: z.string().trim().max(100).optional(),
  active: z.enum(["all", "active", "archived"]).catch("all"),
  sort: z.enum(["book-asc", "book-desc"]).catch("book-asc"),
});
