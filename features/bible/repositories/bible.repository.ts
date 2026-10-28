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
  bibleItemTagsSchema,
} from "../schemas/bible.schema";
import type { BibleMark } from "../types/bible.types";

const markSelect = {
  book: true,
  chapter: true,
  verse: true,
  translation: true,
  bookmarked: true,
  highlight: true,
  tags: true,
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
      create: { ...identity, verses, tags: input.tags ?? [] },
      update: {
        verses,
        ...(input.tags !== undefined ? { tags: input.tags } : {}),
      },
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
    const saving =
      input.operation === "bookmark"
        ? input.bookmarked
        : Boolean(input.highlight);
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
      create: {
        userId,
        book,
        chapter,
        verse,
        translation,
        ...patch,
        tags: input.tags ?? [],
      },
      // Omitted tags preserve concurrent independent annotation changes.
      update: {
        ...patch,
        ...(saving && input.tags !== undefined ? { tags: input.tags } : {}),
      },
      select: { book: true },
    });
  },
  /** One exact item read when opening its save dialog, so re-saving retains tags. */
  async itemTags(userId: string, reference: BibleReference): Promise<string[]> {
    const { book, chapter, verse, translation, selection } = reference;
    const item = selection
      ? await prisma.bibleSavedPassage.findUnique({
          where: {
            userId_book_chapter_translation_selectionKey: {
              userId,
              book,
              chapter,
              translation,
              selectionKey:
                selection === "chapter" ? "chapter" : selection.join(","),
            },
          },
          select: { tags: true },
        })
      : await prisma.bibleVerseMark.findUnique({
          where: {
            userId_book_chapter_verse_translation: {
              userId,
              book,
              chapter,
              verse,
              translation,
            },
          },
          select: { tags: true },
        });
    return item?.tags ?? [];
  },
  /** One owner-scoped update; never creates an annotation from a tag edit. */
  async setTags(
    userId: string,
    input: z.infer<typeof bibleItemTagsSchema>,
  ): Promise<boolean> {
    const { book, chapter, verse, translation, selection, tags } = input;
    const result = selection
      ? await prisma.bibleSavedPassage.updateMany({
          where: {
            userId,
            book,
            chapter,
            translation,
            selectionKey:
              selection === "chapter" ? "chapter" : selection.join(","),
          },
          data: { tags },
        })
      : await prisma.bibleVerseMark.updateMany({
          where: {
            userId,
            book,
            chapter,
            verse,
            translation,
            OR: [{ bookmarked: true }, { highlight: { not: null } }],
          },
          data: { tags },
        });
    return result.count === 1;
  },
  /** Bounded label vocabulary, loaded only for tag UI. No counts or per-item reads. */
  async tags(userId: string): Promise<string[]> {
    const rows = await prisma.$queryRaw<{ tag: string }[]>(Prisma.sql`
      SELECT DISTINCT unnest("tags") AS tag FROM (
        SELECT "tags" FROM "BibleVerseMark"
        WHERE "userId" = ${userId} AND ("bookmarked" = TRUE OR "highlight" IS NOT NULL)
        UNION ALL
        SELECT "tags" FROM "BibleSavedPassage" WHERE "userId" = ${userId}
      ) AS saved ORDER BY tag LIMIT 200
    `);
    return rows.map((row) => row.tag);
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
          "bookmarked", "highlight", "tags", NULL::text AS "selectionKey",
          ARRAY[]::integer[] AS "verses", "updatedAt"
        FROM "BibleVerseMark" WHERE "userId" = ${userId} AND ${markFilter}
          AND ${input.tag ? Prisma.sql`"tags" @> ARRAY[${input.tag}]::text[]` : Prisma.sql`TRUE`}
        ORDER BY "updatedAt" DESC, "book", "chapter", "verse", "translation"
        LIMIT ${input.page * 20 + 1})
        UNION ALL
        (SELECT "book", "chapter", COALESCE("verses"[1], 1) AS "verse",
          "translation"::text AS "translation", TRUE AS "bookmarked",
          NULL::text AS "highlight", "tags", "selectionKey", "verses", "updatedAt"
        FROM "BibleSavedPassage" WHERE "userId" = ${userId} AND ${input.filter === "all" || input.filter === "passages"}
          AND ${input.tag ? Prisma.sql`"tags" @> ARRAY[${input.tag}]::text[]` : Prisma.sql`TRUE`}
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
        tags: row.tags ?? [],
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
