/**
 * Produces the server-only comparison form used by gameplay answer validation.
 * Unicode letters and numbers are preserved while punctuation collapses into
 * single spaces, making case and ordinary punctuation differences irrelevant.
 */
export function normalizeVerseText(text: string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
