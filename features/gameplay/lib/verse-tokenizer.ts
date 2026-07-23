import { normalizeGameplayAnswer } from "@/features/gameplay/lib/answer-validator";

/** One immutable word occurrence; duplicate text retains distinct positions. */
export type VerseToken = {
  index: number;
  text: string;
  normalizedText: string;
};

/**
 * Splits a verse into ordered whitespace-delimited word occurrences.
 *
 * Punctuation stays attached for faithful display while `normalizedText`
 * supports answer comparison. Position identity is never derived from text, so
 * repeated words such as “the” remain independently addressable.
 */
export function tokenizeVerse(verseText: string): VerseToken[] {
  const trimmed = verseText.trim();
  if (!trimmed) return [];

  return trimmed.split(/\s+/u).map((text, index) => ({
    index,
    text,
    normalizedText: normalizeGameplayAnswer(text),
  }));
}
