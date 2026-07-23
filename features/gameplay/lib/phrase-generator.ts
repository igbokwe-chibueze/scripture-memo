import { hashGameplaySeed } from "@/features/gameplay/lib/deterministic-random";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";

/** Stable phrase identity preserves original token positions for validation. */
export type VersePhrase = {
  index: number;
  startTokenIndex: number;
  endTokenIndex: number;
  text: string;
};

/**
 * Divides a verse into deterministic phrase chunks of normally 3–6 words.
 *
 * WHY: The phrase generator is seeded by verse, waypoint, day, and session data
 * supplied by its caller. A retry therefore keeps the same phrase boundaries.
 * Before accepting a seed-derived size, the algorithm avoids leaving a final
 * one- or two-word orphan; short verses remain one honest shorter phrase.
 */
export function generateVersePhrases(
  tokens: readonly VerseToken[],
  seed: string,
): VersePhrase[] {
  const phrases: VersePhrase[] = [];
  let offset = 0;

  while (offset < tokens.length) {
    const remaining = tokens.length - offset;
    let size = remaining <= 6
      ? remaining
      : 3 + hashGameplaySeed(`${seed}:phrase:${phrases.length}`) % 4;
    const remainderAfterChunk = remaining - size;

    if (remainderAfterChunk > 0 && remainderAfterChunk < 3) {
      size -= 3 - remainderAfterChunk;
    }

    const phraseTokens = tokens.slice(offset, offset + size);
    const first = phraseTokens[0];
    const last = phraseTokens.at(-1);
    if (!first || !last) break;

    phrases.push({
      index: phrases.length,
      startTokenIndex: first.index,
      endTokenIndex: last.index,
      text: phraseTokens.map(({ text }) => text).join(" "),
    });
    offset += size;
  }

  return phrases;
}
