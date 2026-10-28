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
  const params = new URLSearchParams({
    book: reference.book,
    chapter: String(reference.chapter),
    verse: String(reference.verse),
    translation: reference.translation,
  });
  if (reference.selection)
    params.set(
      "selection",
      reference.selection === "chapter"
        ? "chapter"
        : reference.selection.join(","),
    );
  return `/bible?${params}`;
}

/** Compact labels coalesce consecutive verses without changing arbitrary sets. */
export function bibleSelectionLabel(reference: BibleReference): string {
  const chapter = bibleReferenceLabel({ ...reference, verse: undefined });
  if (!reference.selection) return bibleReferenceLabel(reference);
  if (reference.selection === "chapter") return chapter;
  const values = [...new Set(reference.selection)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const first = values[index];
    let last = first;
    while (values[index + 1] === last + 1) last = values[++index];
    ranges.push(first === last ? String(first) : `${first}–${last}`);
  }
  return `${chapter}:${ranges.join(", ")}`;
}

/** Parse only bounded URL data. Validation of actual chapter counts remains
 * in bibleReferenceSchema; malformed links cannot trigger arbitrary fetches. */
export function bibleSelectionFromQuery(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (value === "chapter") return "chapter";
  if (
    typeof value !== "string" ||
    value.length > 703 ||
    !/^\d+(,\d+)*$/.test(value)
  )
    return null;
  return value.split(",").map(Number);
}

/** Chapter stepping crosses book boundaries and disables at Genesis/Revelation ends. */
export function adjacentBibleChapter(
  reference: BibleReference,
  direction: -1 | 1,
): BibleReference | null {
  // Chapter stepping starts a fresh passage instead of carrying an unrelated set.
  const plain = { ...reference };
  delete plain.selection;
  const index = BIBLE_BOOKS.findIndex((book) => book.id === reference.book);
  const book = BIBLE_BOOKS[index];
  if (!book) return null;
  const chapter = reference.chapter + direction;
  if (chapter >= 1 && chapter <= book.chapters.length)
    return { ...plain, chapter, verse: 1 };
  const next = BIBLE_BOOKS[index + direction];
  return next
    ? {
        ...plain,
        book: next.id,
        chapter: direction === 1 ? 1 : next.chapters.length,
        verse: 1,
      }
    : null;
}
