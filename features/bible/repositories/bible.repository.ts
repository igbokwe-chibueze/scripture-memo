import "server-only";

/** Only this repository accesses private annotations; public Bible text stays at the provider. */
import { prisma } from "@/lib/prisma";
import type { z } from "zod";
import type {
  BibleReference,
  bibleMarkSchema,
  bibleSavedSchema,
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
    const rows = await prisma.bibleVerseMark.findMany({
      where: {
        userId,
        ...(input.filter === "bookmarks"
          ? { bookmarked: true }
          : input.filter === "highlights"
            ? { highlight: { not: null } }
            : { OR: [{ bookmarked: true }, { highlight: { not: null } }] }),
      },
      select: markSelect,
      orderBy: [
        { updatedAt: "desc" },
        { book: "asc" },
        { chapter: "asc" },
        { verse: "asc" },
        { translation: "asc" },
      ],
      skip: (input.page - 1) * 20,
      take: 21,
    });
    return {
      marks: rows.slice(0, 20) as BibleMark[],
      hasNext: rows.length > 20,
    };
  },
};
