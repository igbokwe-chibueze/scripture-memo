/** All route/action inputs are bounded before auth or upstream/database work. */
import { z } from "zod";
import { BIBLE_BOOKS } from "../data/bible-catalog";

/** Canonical references reject non-existent books, chapters and verse numbers. */
export const bibleReferenceSchema = z
  .object({
    book: z.string().refine((id) => BIBLE_BOOKS.some((book) => book.id === id)),
    chapter: z.number().int().min(1).max(150),
    verse: z.number().int().min(1).max(176).default(1),
    translation: z.enum(["KJV", "WEB", "BSB"]),
  })
  .superRefine((value, ctx) => {
    const book = BIBLE_BOOKS.find((item) => item.id === value.book);
    const verses = book?.chapters[value.chapter - 1];
    if (!verses || value.verse > verses) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid Bible reference.",
        path: ["verse"],
      });
    }
  });

/** Explicit desired state makes retries idempotent and avoids read-before-toggle races. */
export const bibleMarkSchema = bibleReferenceSchema
  .safeExtend({
    operation: z.enum(["bookmark", "highlight"]),
    bookmarked: z.boolean().optional(),
    highlight: z.enum(["teal", "gold", "blue"]).nullable().optional(),
  })
  .refine((value) =>
    value.operation === "bookmark"
      ? value.bookmarked !== undefined
      : value.highlight !== undefined,
  );

/** Chapter-sized study requests accept only known commentary IDs. */
export const bibleStudySchema = bibleReferenceSchema.safeExtend({
  tab: z.enum(["words", "commentary", "crossReferences"]),
  commentary: z.enum([
    "adam-clarke",
    "jamieson-fausset-brown",
    "john-calvin",
    "john-gill",
    "keil-delitzsch",
    "matthew-henry",
    "tyndale",
  ]),
});

/** Paginated searches cannot fetch arbitrary URLs or create unbounded response payloads. */
export const bibleSearchSchema = z.object({
  q: z.string().trim().min(3).max(100),
  translation: z.enum(["KJV", "WEB", "BSB"]),
  page: z.number().int().min(1).max(1600).default(1),
});

/** The saved library is owner-scoped; callers can only choose a bounded page/filter. */
export const bibleSavedSchema = z.object({
  page: z.number().int().min(1).max(10000).default(1),
  filter: z.enum(["all", "bookmarks", "highlights"]).default("all"),
});

/** Shared serializable reference used by reader tabs, links and private marks. */
export type BibleReference = z.infer<typeof bibleReferenceSchema>;
