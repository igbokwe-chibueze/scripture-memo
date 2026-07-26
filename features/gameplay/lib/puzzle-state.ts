import { deterministicShuffle } from "@/features/gameplay/lib/deterministic-random";
import type { VersePhrase } from "@/features/gameplay/lib/phrase-generator";

export type PuzzlePlacements = Readonly<Record<number, number>>;

/**
 * Selects stable phrase positions according to the current day difficulty.
 *
 * Phrase indexes are used instead of phrase text so repeated phrases remain
 * independent objects. A positive percentage always removes at least one
 * phrase, while Radiance can remove the complete verse structure.
 */
export function generateHiddenPhraseIndexes(
  phrases: readonly VersePhrase[],
  hiddenPercent: number,
  seed: string,
  minimumHiddenCount = 1,
): number[] {
  if (!Number.isFinite(hiddenPercent) || hiddenPercent < 0 || hiddenPercent > 100) {
    throw new RangeError("Hidden percentage must be between 0 and 100.");
  }
  if (phrases.length === 0 || hiddenPercent === 0) return [];

  const hiddenCount = Math.min(
    phrases.length,
    Math.max(minimumHiddenCount, Math.ceil(phrases.length * hiddenPercent / 100)),
  );

  return deterministicShuffle(
    phrases.map(({ index }) => index),
    `${seed}:hidden-phrases`,
  )
    .slice(0, hiddenCount)
    .sort((left, right) => left - right);
}

/**
 * Creates a repeatable phrase-bank order without losing occurrence identity.
 *
 * Duplicate phrase text is intentionally harmless because the shuffled values
 * are original phrase positions, never display strings.
 */
export function createPuzzlePhraseBank(
  hiddenPhraseIndexes: readonly number[],
  seed: string,
): number[] {
  return deterministicShuffle(hiddenPhraseIndexes, `${seed}:phrase-bank`);
}

/** Places or moves one phrase while preserving one phrase per target slot. */
export function placePuzzlePhrase(
  placements: PuzzlePlacements,
  phraseIndex: number,
  slotIndex: number,
): PuzzlePlacements {
  const nextPlacements = Object.fromEntries(
    Object.entries(placements).filter(
      ([existingSlot, existingPhrase]) =>
        Number(existingSlot) !== slotIndex && existingPhrase !== phraseIndex,
    ),
  );
  return { ...nextPlacements, [slotIndex]: phraseIndex };
}

/** Returns one placed phrase to the bank without disturbing other slots. */
export function removePuzzlePlacement(
  placements: PuzzlePlacements,
  slotIndex: number,
): PuzzlePlacements {
  return Object.fromEntries(
    Object.entries(placements).filter(
      ([existingSlot]) => Number(existingSlot) !== slotIndex,
    ),
  );
}

/** Identifies every hidden position that lacks its original phrase occurrence. */
export function getIncorrectPuzzleSlots(
  hiddenPhraseIndexes: readonly number[],
  placements: PuzzlePlacements,
): number[] {
  return hiddenPhraseIndexes.filter(
    (slotIndex) => placements[slotIndex] !== slotIndex,
  );
}

/**
 * Reconstructs a complete verse-shaped submission for server verification.
 *
 * Empty puzzle slots become empty strings, so an incomplete client arrangement
 * cannot accidentally normalize to the trusted canonical translation.
 */
export function reconstructPuzzleAnswer(
  phrases: readonly VersePhrase[],
  hiddenPhraseIndexes: readonly number[],
  placements: PuzzlePlacements,
): string {
  const hidden = new Set(hiddenPhraseIndexes);
  return phrases
    .map((phrase) => {
      if (!hidden.has(phrase.index)) return phrase.text;
      const placedPhraseIndex = placements[phrase.index];
      return placedPhraseIndex === undefined
        ? ""
        : (phrases[placedPhraseIndex]?.text ?? "");
    })
    .join(" ");
}
