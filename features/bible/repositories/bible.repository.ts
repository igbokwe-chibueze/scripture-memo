import "server-only";

/** Only this repository accesses private annotations; public Bible text stays at the provider. */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type { z } from "zod";
import type {
  BibleReference,
  bibleMarkSchema,
  bibleSavedSchema,
  biblePassageSaveSchema,
} from "../schemas/bible.schema";
import type { BibleMark } from "../types/bible.types";

const markSelect = {
  book: true,
  chapter: true,
  verse: true,
  translation: true,
  bookmarked: true,
  highlight: true,
} as const;

/** The server supplies userId on every operation; no caller can address another player's marks. */
export const bibleRepository = {
  /** One atomic write per explicit save/remove, regardless of selection size.
   * Canonical sorted sets provide stable identities without read-before-write. */
  async setPassage(
    userId: string,
    input: z.infer<typeof biblePassageSaveSchema>,
  ): Promise<void> {
    const { book, chapter, translation, selection } = input;
    const verses = selection === "chapter" ? [] : selection;
    const identity = {
      userId,
      book,
      chapter,
      translation,
      selectionKey: selection === "chapter" ? "chapter" : verses.join(","),
    };
    if (!input.saved) {
      await prisma.bibleSavedPassage.deleteMany({ where: identity });
      return;
    }
    await prisma.bibleSavedPassage.upsert({
      where: { userId_book_chapter_translation_selectionKey: identity },
      create: { ...identity, verses },
      update: { verses },
      select: { book: true },
    });
  },
  /** One bounded chapter read; rows with cleared annotations are ignored. */
  async chapterMarks(
    userId: string,
    reference: BibleReference,
  ): Promise<BibleMark[]> {
    return (await prisma.bibleVerseMark.findMany({
      where: {
        userId,
        book: reference.book,
        chapter: reference.chapter,
        translation: reference.translation,
        OR: [{ bookmarked: true }, { highlight: { not: null } }],
      },
      select: markSelect,
      take: 176,
    })) as BibleMark[];
  },
  /** An atomic upsert changes only the requested field, preserving simultaneous bookmark/highlight changes. */
  async setMark(
    userId: string,
    input: z.infer<typeof bibleMarkSchema>,
  ): Promise<void> {
    const { book, chapter, verse, translation } = input;
    const patch =
      input.operation === "bookmark"
        ? { bookmarked: input.bookmarked! }
        : { highlight: input.highlight! };
    await prisma.bibleVerseMark.upsert({
      where: {
        userId_book_chapter_verse_translation: {
          userId,
          book,
          chapter,
          verse,
          translation,
        },
      },
      create: { userId, book, chapter, verse, translation, ...patch },
      update: patch,
      select: { book: true },
    });
  },
  /** Look-ahead pagination avoids an additional count query and never loads a whole private library. */
  async saved(
    userId: string,
    input: z.infer<typeof bibleSavedSchema>,
  ): Promise<{ marks: BibleMark[]; hasNext: boolean }> {
    // A single parameterized UNION paginates both private collections together.
    // Independent paginated reads would skip/repeat items when timestamps mix.
    // Owner indexes bound both branches; no count or per-verse query is needed.
    const markFilter =
      input.filter === "passages"
        ? Prisma.sql`FALSE`
        : input.filter === "bookmarks"
          ? Prisma.sql`"bookmarked" = TRUE`
          : input.filter === "highlights"
            ? Prisma.sql`"highlight" IS NOT NULL`
            : Prisma.sql`("bookmarked" = TRUE OR "highlight" IS NOT NULL)`;
    const rows = await prisma.$queryRaw<
      (BibleMark & { selectionKey: string | null; verses: number[] })[]
    >(Prisma.sql`
      SELECT * FROM (
        (SELECT "book", "chapter", "verse", "translation"::text AS "translation",
          "bookmarked", "highlight", NULL::text AS "selectionKey",
          ARRAY[]::integer[] AS "verses", "updatedAt"
        FROM "BibleVerseMark" WHERE "userId" = ${userId} AND ${markFilter}
        ORDER BY "updatedAt" DESC, "book", "chapter", "verse", "translation"
        LIMIT ${input.page * 20 + 1})
        UNION ALL
        (SELECT "book", "chapter", COALESCE("verses"[1], 1) AS "verse",
          "translation"::text AS "translation", TRUE AS "bookmarked",
          NULL::text AS "highlight", "selectionKey", "verses", "updatedAt"
        FROM "BibleSavedPassage" WHERE "userId" = ${userId} AND ${input.filter !== "highlights"}
        ORDER BY "updatedAt" DESC, "book", "chapter", "verse", "translation", "selectionKey"
        LIMIT ${input.page * 20 + 1})
      ) AS library
      ORDER BY "updatedAt" DESC, "book", "chapter", "verse", "translation", "selectionKey" NULLS FIRST
      LIMIT 21 OFFSET ${(input.page - 1) * 20}
    `);
    return {
      marks: rows.slice(0, 20).map((row) => ({
        book: row.book,
        chapter: row.chapter,
        verse: row.verse,
        translation: row.translation,
        bookmarked: row.bookmarked,
        highlight: row.highlight,
        ...(row.selectionKey
          ? {
              selection:
                row.selectionKey === "chapter"
                  ? ("chapter" as const)
                  : row.verses,
            }
          : {}),
      })),
      hasNext: rows.length > 20,
    };
  },
};
