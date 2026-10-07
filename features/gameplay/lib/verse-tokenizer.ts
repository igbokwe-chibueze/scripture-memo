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
 * Splits a verse into ordered word occurrences separated by whitespace or an
 * em dash.
 *
 * Punctuation is retained separately for faithful verse display but excluded
 * from gameplay tiles. An em dash remains attached visually to the preceding
 * word but ends that gameplay token, so "salvation—whom" creates two words.
 * Position identity is never derived from text, so
 * repeated words such as “the” remain independently addressable.
 */
export function tokenizeVerse(verseText: string): VerseToken[] {
  const trimmed = verseText.trim();
  if (!trimmed) return [];

  const tokens: VerseToken[] = [];
  let pendingLeadingPunctuation = "";

  for (const segment of trimmed.split(/(—)/u)) {
    if (segment === "—") {
      const previousIndex = tokens.length - 1;
      const previousToken = tokens[previousIndex];

      if (previousToken) {
        tokens[previousIndex] = {
          ...previousToken,
          text: `${previousToken.text}${segment}`,
          trailingPunctuation: `${previousToken.trailingPunctuation}${segment}`,
        };
      } else {
        pendingLeadingPunctuation += segment;
      }

      continue;
    }

    const words = segment.trim().split(/\s+/u).filter(Boolean);

    for (const word of words) {
      const text = `${pendingLeadingPunctuation}${word}`;
      pendingLeadingPunctuation = "";

      const leadingPunctuation = text.match(/^[^\p{L}\p{N}]*/u)?.[0] ?? "";
      const trailingPunctuation = text.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? "";
      const wordEnd = trailingPunctuation.length > 0
        ? text.length - trailingPunctuation.length
        : text.length;
      const wordText = text.slice(leadingPunctuation.length, wordEnd);

      tokens.push({
        index: tokens.length,
        text,
        wordText,
        leadingPunctuation,
        trailingPunctuation,
        normalizedText: normalizeGameplayAnswer(wordText),
      });
    }
  }

  return tokens;
}
