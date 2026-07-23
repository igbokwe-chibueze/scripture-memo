import { normalizeGameplayAnswer } from "@/features/gameplay/lib/answer-validator";

/** One immutable word occurrence; duplicate text retains distinct positions. */
export type VerseToken = {
  index: number;
  text: string;
  wordText: string;
  leadingPunctuation: string;
  trailingPunctuation: string;
  normalizedText: string;
};

/**
 * Splits a verse into ordered whitespace-delimited word occurrences.
 *
 * Punctuation is retained separately for faithful verse display but excluded
 * from gameplay tiles. Position identity is never derived from text, so
 * repeated words such as “the” remain independently addressable.
 */
export function tokenizeVerse(verseText: string): VerseToken[] {
  const trimmed = verseText.trim();
  if (!trimmed) return [];

  return trimmed.split(/\s+/u).map((text, index) => {
    const leadingPunctuation = text.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "";
    const trailingPunctuation = text.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? "";
    const wordEnd = trailingPunctuation.length > 0
      ? text.length - trailingPunctuation.length
      : text.length;
    const wordText = text.slice(leadingPunctuation.length, wordEnd);

    return {
      index,
      text,
      wordText,
      leadingPunctuation,
      trailingPunctuation,
      normalizedText: normalizeGameplayAnswer(wordText),
    };
  });
}
