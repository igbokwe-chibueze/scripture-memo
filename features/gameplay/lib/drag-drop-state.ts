import { deterministicShuffle } from "@/features/gameplay/lib/deterministic-random";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";

export type DragDropPlacements = Readonly<Record<number, number>>;

/**
 * Produces a stable word-bank order while preserving duplicate occurrences.
 *
 * WHY: Token indexes, rather than word strings, are shuffled and stored. Two
 * identical words therefore remain independent draggable objects and can be
 * validated against their exact original positions.
 */
export function createDragDropWordBank(
  hiddenTokenIndexes: readonly number[],
  seed: string,
): number[] {
  return deterministicShuffle(hiddenTokenIndexes, `${seed}:word-bank`);
}

/** Places one token in one blank, removing it from any previous blank first. */
export function placeDragDropToken(
  placements: DragDropPlacements,
  tokenIndex: number,
  slotIndex: number,
): DragDropPlacements {
  const nextPlacements = Object.fromEntries(
    Object.entries(placements).filter(
      ([existingSlot, existingToken]) =>
        Number(existingSlot) !== slotIndex && existingToken !== tokenIndex,
    ),
  );
  return { ...nextPlacements, [slotIndex]: tokenIndex };
}

/** Returns the placed token to the bank without changing other answers. */
export function removeDragDropPlacement(
  placements: DragDropPlacements,
  slotIndex: number,
): DragDropPlacements {
  return Object.fromEntries(
    Object.entries(placements).filter(([existingSlot]) => Number(existingSlot) !== slotIndex),
  );
}

/** Identifies every blank whose placed token does not match its position. */
export function getIncorrectDragDropSlots(
  hiddenTokenIndexes: readonly number[],
  placements: DragDropPlacements,
): number[] {
  return hiddenTokenIndexes.filter((slotIndex) => placements[slotIndex] !== slotIndex);
}

/**
 * Reconstructs the complete submitted verse from visible and placed tokens.
 *
 * Missing slots become empty strings, guaranteeing an incomplete client claim
 * cannot accidentally match the trusted canonical verse on the server.
 */
export function reconstructDragDropAnswer(
  tokens: readonly VerseToken[],
  hiddenTokenIndexes: readonly number[],
  placements: DragDropPlacements,
): string {
  const hidden = new Set(hiddenTokenIndexes);
  return tokens
    .map((token) => {
      if (!hidden.has(token.index)) return token.text;
      const placedTokenIndex = placements[token.index];
      const placedToken = placedTokenIndex === undefined
        ? undefined
        : tokens[placedTokenIndex];
      return placedToken
        ? `${token.leadingPunctuation}${placedToken.wordText}${token.trailingPunctuation}`
        : "";
    })
    .join(" ");
}
