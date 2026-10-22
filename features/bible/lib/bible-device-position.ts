/** Device-only reading position: no account identity, server action or database
 * call. Storage contains only a canonical reference, never Scripture or notes. */
import {
  bibleReferenceSchema,
  type BibleReference,
} from "../schemas/bible.schema";

const STORAGE_KEY = "scripture-memo:bible-position";

/** A stable string snapshot supports hydration-safe React subscriptions.
 * Blocked storage behaves like a first visit; reading still remains usable. */
export function readBibleDevicePosition(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Treat browser contents as untrusted, including obsolete edition/location data. */
export function parseBibleDevicePosition(
  value: string | null,
): BibleReference | null {
  if (!value) return null;
  const params = new URLSearchParams(value);
  const parsed = bibleReferenceSchema.safeParse({
    book: params.get("book"),
    chapter: Number(params.get("chapter")),
    verse: Number(params.get("verse")),
    translation: params.get("translation"),
  });
  return parsed.success ? parsed.data : null;
}

/** Synchronous saving survives an immediate refresh. Callers report failures
 * without preventing passage navigation when browser storage is disabled. */
export function saveBibleDevicePosition(reference: BibleReference): void {
  const value = bibleReferenceSchema.parse(reference);
  window.localStorage.setItem(
    STORAGE_KEY,
    new URLSearchParams({
      book: value.book,
      chapter: String(value.chapter),
      verse: String(value.verse),
      translation: value.translation,
    }).toString(),
  );
}

/** Listen only to browser events; no polling or network request is needed. */
export function subscribeBibleDevicePosition(notify: () => void): () => void {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
}
