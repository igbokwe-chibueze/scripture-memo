import { deterministicShuffle } from "@/features/gameplay/lib/deterministic-random";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";
import { DIFFICULTY_RANGES } from "@/lib/constants";
import type { DayLevel } from "@/lib/generated/prisma/enums";

/**
 * Chooses one stable percentage within the day difficulty's inclusive range.
 *
 * Different sessions may vary within the product range, while retries in the
 * same session reproduce the exact exercise and avoid moving blanks.
 */
export function getSessionHiddenPercent(dayLevel: DayLevel, seed: string): number {
  const range = DIFFICULTY_RANGES[dayLevel];
  const values = Array.from(
    { length: range.maxHiddenPercent - range.minHiddenPercent + 1 },
    (_, offset) => range.minHiddenPercent + offset,
  );
  return deterministicShuffle(values, `${seed}:hidden-percent`)[0] ?? range.minHiddenPercent;
}

/**
 * Selects stable token positions to hide for one session and mode.
 *
 * The requested percentage is converted to an exact count, with any positive
 * percentage hiding at least one eligible word. A seeded ordering then chooses
 * positions without `Math.random()`, ensuring refreshes and retries reproduce
 * the same exercise rather than moving blanks unexpectedly.
 */
export function generateHiddenTokenIndexes(
  tokens: readonly VerseToken[],
  hiddenPercent: number,
  seed: string,
): number[] {
  if (!Number.isFinite(hiddenPercent) || hiddenPercent < 0 || hiddenPercent > 100) {
    throw new RangeError("Hidden percentage must be between 0 and 100.");
  }

  const eligibleIndexes = tokens
    .filter(({ normalizedText }) => normalizedText.length > 0)
    .map(({ index }) => index);
  if (eligibleIndexes.length === 0 || hiddenPercent === 0) return [];

  const hiddenCount = Math.min(
    eligibleIndexes.length,
    Math.max(1, Math.ceil(eligibleIndexes.length * hiddenPercent / 100)),
  );

  return deterministicShuffle(eligibleIndexes, seed)
    .slice(0, hiddenCount)
    .sort((left, right) => left - right);
}
