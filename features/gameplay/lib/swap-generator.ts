import { deterministicShuffle } from "@/features/gameplay/lib/deterministic-random";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";

export type SwapToken = {
  /** Current visible slot. */
  position: number;
  /** Canonical occurrence identity, independent of possibly duplicated text. */
  originalIndex: number;
  /** Punctuation-free word text; punctuation remains anchored to its verse slot. */
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
    return tokens.map(({ index, wordText }) => ({
      position: index,
      originalIndex: index,
      text: wordText,
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
      text: sourceToken?.wordText ?? token.wordText,
      isSwappable: selectedSet.has(token.index),
    };
  });
}

/** Position identity makes duplicate-word validation unambiguous. */
export function areSwapTokensCorrect(tokens: readonly SwapToken[]): boolean {
  return tokens.every(({ position, originalIndex }) => position === originalIndex);
}

/**
 * Exchanges the word occurrences at two eligible positions.
 *
 * WHY: Positions remain fixed while occurrence identity and display text move.
 * This prevents punctuation and slot feedback from travelling with a word and
 * keeps duplicate occurrences unambiguous throughout repeated swaps.
 */
export function swapTokenPositions(
  tokens: readonly SwapToken[],
  firstPosition: number,
  secondPosition: number,
): SwapToken[] {
  const first = tokens[firstPosition];
  const second = tokens[secondPosition];
  if (
    !first ||
    !second ||
    !first.isSwappable ||
    !second.isSwappable ||
    firstPosition === secondPosition
  ) {
    return [...tokens];
  }

  return tokens.map((token) => {
    if (token.position === firstPosition) {
      return {
        ...token,
        originalIndex: second.originalIndex,
        text: second.text,
      };
    }
    if (token.position === secondPosition) {
      return {
        ...token,
        originalIndex: first.originalIndex,
        text: first.text,
      };
    }
    return token;
  });
}

/** Returns every eligible slot whose occurrence has not reached its origin. */
export function getIncorrectSwapPositions(
  tokens: readonly SwapToken[],
): number[] {
  return tokens
    .filter(
      ({ isSwappable, position, originalIndex }) =>
        isSwappable && position !== originalIndex,
    )
    .map(({ position }) => position);
}

/**
 * Reconstructs the submitted verse while keeping punctuation at canonical slots.
 *
 * Client reconstruction is evidence only. The completion repository normalizes
 * and compares it with the trusted session translation before recording success.
 */
export function reconstructSwapAnswer(
  swapTokens: readonly SwapToken[],
  verseTokens: readonly VerseToken[],
): string {
  return swapTokens
    .map((swapToken) => {
      const verseToken = verseTokens[swapToken.position];
      if (!verseToken) return "";
      return `${verseToken.leadingPunctuation}${swapToken.text}${verseToken.trailingPunctuation}`;
    })
    .join(" ");
}
