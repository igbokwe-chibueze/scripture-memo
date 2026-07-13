import {
  BIBLE_BOOK_NAMES,
  BIBLE_STRUCTURE,
} from "@/features/verses/data/bible-structure";

export type BibleBookName = (typeof BIBLE_BOOK_NAMES)[number];

const chaptersByBook = new Map<string, readonly number[]>(
  BIBLE_STRUCTURE.map((book) => [book.name, book.chapters]),
);

/** Returns whether an unknown string is one of the supported 66 book names. */
export function isBibleBookName(value: string): value is BibleBookName {
  return chaptersByBook.has(value);
}

/** Returns the canonical chapter count for a supported Bible book. */
export function getBibleChapterCount(book: string): number | undefined {
  return chaptersByBook.get(book)?.length;
}

/** Returns the exact verse limit for a valid book and one-based chapter. */
export function getBibleVerseCount(book: string, chapter: number): number | undefined {
  if (!Number.isInteger(chapter) || chapter < 1) return undefined;
  return chaptersByBook.get(book)?.[chapter - 1];
}

/** Builds Scripture Memo's single canonical human-readable reference format. */
export function formatBibleReference(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd: number | "" | null,
): string {
  const displayBook = book === "Psalms" ? "Psalm" : book;
  const start = `${displayBook} ${chapter}:${verseStart}`;
  return verseEnd === "" || verseEnd === null || verseEnd === verseStart
    ? start
    : `${start}–${verseEnd}`;
}
