import { z } from "zod";

const translationTextSchema = z
  .string()
  .trim()
  .min(1, "Translation text is required.")
  .max(3000, "Translation text cannot exceed 3000 characters.");

/** Complete create/edit form contract for a verse and MVP translations. */
export const verseFormSchema = z
  .object({
    id: z.string().cuid().optional(),
    reference: z
      .string()
      .trim()
      .min(3, "Reference is required.")
      .max(100, "Reference cannot exceed 100 characters.")
      .regex(/^[\p{L}\p{N} .:,-]+$/u, "Enter a valid Scripture reference."),
    book: z.string().trim().min(2, "Book is required.").max(60),
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
  .refine(
    (value) => value.verseEnd === "" || value.verseEnd >= value.verseStart,
    { path: ["verseEnd"], message: "Ending verse cannot precede the starting verse." },
  );

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
