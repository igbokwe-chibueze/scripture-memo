import { hashGameplaySeed } from "@/features/gameplay/lib/deterministic-random";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";
import type { DayLevel } from "@/lib/generated/prisma/enums";

/** Stable phrase identity preserves original token positions for validation. */
export type VersePhrase = {
  index: number;
  startTokenIndex: number;
  endTokenIndex: number;
  text: string;
};

/**
 * Chooses enough chunks to make ordering meaningful without creating tiny tiles.
 *
 * Two-word phrases are the smallest normal game piece. Six or more words can
 * always support at least three such pieces, while four or five words support
 * two. The upper bound prevents balancing from creating one-word fragments
 * except when the entire verse itself contains fewer than two words.
 */
function getBalancedChunkCount(tokenCount: number): number {
  if (tokenCount === 0) return 0;

  const minimumUsefulCount = tokenCount >= 6 ? 3 : tokenCount >= 4 ? 2 : 1;
  const maximumWithoutSingletons = Math.max(1, Math.floor(tokenCount / 2));
  const desiredCount = Math.max(minimumUsefulCount, Math.round(tokenCount / 3));

  return Math.min(maximumWithoutSingletons, desiredCount);
}

/**
 * Divides a verse into deterministic, balanced phrase chunks of normally 2–4 words.
 *
 * WHY: The phrase generator uses the verse/session seed and challenge day
 * supplied by its caller. A retry therefore keeps identical phrase boundaries.
 * Balancing the full token count up front avoids both oversized phrase tiles and
 * tiny trailing orphans. The seed rotates where extra words are placed, so the
 * opening phrase is not always the largest piece.
 */
export function generateVersePhrases(
  tokens: readonly VerseToken[],
  seed: string,
  dayLevel: DayLevel,
): VersePhrase[] {
  const chunkCount = getBalancedChunkCount(tokens.length);
  if (chunkCount === 0) return [];

  const baseSize = Math.floor(tokens.length / chunkCount);
  const extraWords = tokens.length % chunkCount;
  const extraStart =
    hashGameplaySeed(`${seed}:${dayLevel}:balanced-extra-start`) % chunkCount;
  const sizes = Array.from({ length: chunkCount }, (_, index) => {
    const distanceFromStart = (index - extraStart + chunkCount) % chunkCount;
    return baseSize + (distanceFromStart < extraWords ? 1 : 0);
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
