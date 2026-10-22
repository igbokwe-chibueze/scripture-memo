/** Pure reference helpers keep tabs, sharing and navigation on the same canonical identity. */
import { BIBLE_BOOKS } from "../data/bible-catalog";
import type { BibleReference } from "../schemas/bible.schema";

/** Human-readable references use the fixed English book names of these English editions. */
export function bibleReferenceLabel(
  reference: Pick<BibleReference, "book" | "chapter"> & { verse?: number },
): string {
  const name =
    BIBLE_BOOKS.find((book) => book.id === reference.book)?.name ??
    reference.book;
  return `${name} ${reference.chapter}${reference.verse ? `:${reference.verse}` : ""}`;
}

/** Translation belongs in the link so sharing never silently changes the quoted edition. */
export function bibleReferenceUrl(reference: BibleReference): string {
  return `/bible?${new URLSearchParams({ book: reference.book, chapter: String(reference.chapter), verse: String(reference.verse), translation: reference.translation })}`;
}

/** Chapter stepping crosses book boundaries and disables at Genesis/Revelation ends. */
export function adjacentBibleChapter(
  reference: BibleReference,
  direction: -1 | 1,
): BibleReference | null {
  const index = BIBLE_BOOKS.findIndex((book) => book.id === reference.book);
  const book = BIBLE_BOOKS[index];
  if (!book) return null;
  const chapter = reference.chapter + direction;
  if (chapter >= 1 && chapter <= book.chapters.length)
    return { ...reference, chapter, verse: 1 };
  const next = BIBLE_BOOKS[index + direction];
  return next
    ? {
        ...reference,
        book: next.id,
        chapter: direction === 1 ? 1 : next.chapters.length,
        verse: 1,
      }
    : null;
}
