import { deterministicShuffle } from "@/features/gameplay/lib/deterministic-random";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";

export type SwapToken = {
  /** Current visible slot. */
  position: number;
  /** Canonical occurrence identity, independent of possibly duplicated text. */
  originalIndex: number;
  text: string;
  isSwappable: boolean;
};

/**
 * Produces a deterministic position-based swap puzzle.
 *
 * WHY: Tokens are tracked by original index, never by word text. In “the Lord
 * is my Lord”, both Lord occurrences remain distinguishable even though their
 * display text matches. Selected occurrences rotate through chosen positions;
 * validation succeeds only when every `originalIndex` returns to its position.
 */
export function generateSwapTokens(
  tokens: readonly VerseToken[],
  swappedPercent: number,
  seed: string,
): SwapToken[] {
  if (!Number.isFinite(swappedPercent) || swappedPercent < 0 || swappedPercent > 100) {
    throw new RangeError("Swapped percentage must be between 0 and 100.");
  }
  if (tokens.length < 2 || swappedPercent === 0) {
    return tokens.map(({ index, text }) => ({
      position: index,
      originalIndex: index,
      text,
      isSwappable: false,
    }));
  }

  const requestedCount = Math.ceil(tokens.length * swappedPercent / 100);
  const selectedPositions = deterministicShuffle(
    tokens.map(({ index }) => index),
    seed,
  ).slice(0, Math.min(tokens.length, Math.max(2, requestedCount)));
  const selectedSet = new Set(selectedPositions);
  const sourceByDestination = new Map<number, number>();

  selectedPositions.forEach((destination, index) => {
    const source = selectedPositions[(index + 1) % selectedPositions.length];
    if (source !== undefined) sourceByDestination.set(destination, source);
  });

  return tokens.map((token) => {
    const sourceIndex = sourceByDestination.get(token.index);
    const sourceToken = sourceIndex === undefined ? token : tokens[sourceIndex];

    return {
      position: token.index,
      originalIndex: sourceToken?.index ?? token.index,
      text: sourceToken?.text ?? token.text,
      isSwappable: selectedSet.has(token.index),
    };
  });
}

/** Position identity makes duplicate-word validation unambiguous. */
export function areSwapTokensCorrect(tokens: readonly SwapToken[]): boolean {
  return tokens.every(({ position, originalIndex }) => position === originalIndex);
}
