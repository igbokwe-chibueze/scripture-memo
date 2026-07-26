import { hashGameplaySeed } from "@/features/gameplay/lib/deterministic-random";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";
import { DayLevel, type DayLevel as DayLevelValue } from "@/lib/generated/prisma/enums";

/** Stable phrase identity preserves original token positions for validation. */
export type VersePhrase = {
  index: number;
  startTokenIndex: number;
  endTokenIndex: number;
  text: string;
};

const SHORT_VERSE_MAX_WORDS = 6;

/** Returns the approved short-verse chunk count for the current challenge day. */
function getShortVerseChunkCount(
  tokenCount: number,
  dayLevel: DayLevelValue,
): number {
  const desiredCount = dayLevel === DayLevel.GLIMMER ? 2 : 3;
  return Math.min(tokenCount, desiredCount);
}

/**
 * Balances a short test verse into useful Puzzle tiles for the current day.
 *
 * WHY: A five-word verse cannot produce multiple standard 3–6-word phrases.
 * Keeping it as one phrase makes every day identical, so the approved testing
 * exception permits smaller chunks while retaining canonical word order.
 */
function generateShortVersePhrases(
  tokens: readonly VerseToken[],
  dayLevel: DayLevelValue,
): VersePhrase[] {
  const chunkCount = getShortVerseChunkCount(tokens.length, dayLevel);
  if (chunkCount === 0) return [];

  const baseSize = Math.floor(tokens.length / chunkCount);
  const extraWords = tokens.length % chunkCount;
  const sizes = Array.from({ length: chunkCount }, (_, index) => {
    if (extraWords === 0) return baseSize;
    // Spreading two extras across the ends gives five-word Glow verses a
    // natural 2–1–2 rhythm instead of one disproportionately large tile.
    if (extraWords === 2) {
      return baseSize + (index === 0 || index === chunkCount - 1 ? 1 : 0);
    }
    return baseSize + (index < extraWords ? 1 : 0);
  });

  let offset = 0;
  return sizes.flatMap((size, index) => {
    const phraseTokens = tokens.slice(offset, offset + size);
    offset += size;
    const first = phraseTokens[0];
    const last = phraseTokens.at(-1);
    if (!first || !last) return [];
    return [{
      index,
      startTokenIndex: first.index,
      endTokenIndex: last.index,
      text: phraseTokens.map(({ text }) => text).join(" "),
    }];
  });
}

/**
 * Divides a verse into deterministic phrase chunks of normally 3–6 words.
 *
 * WHY: The phrase generator is seeded by verse, waypoint, day, and session data
 * supplied by its caller. A retry therefore keeps the same phrase boundaries.
 * Before accepting a seed-derived size, the algorithm avoids leaving a final
 * one- or two-word orphan. Verses of six words or fewer use the documented
 * day-specific testing exception so their Puzzle does not collapse to one tile.
 */
export function generateVersePhrases(
  tokens: readonly VerseToken[],
  seed: string,
  dayLevel: DayLevelValue,
): VersePhrase[] {
  if (tokens.length <= SHORT_VERSE_MAX_WORDS) {
    return generateShortVersePhrases(tokens, dayLevel);
  }

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
