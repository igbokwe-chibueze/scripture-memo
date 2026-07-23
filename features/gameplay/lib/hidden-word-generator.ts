import { deterministicShuffle } from "@/features/gameplay/lib/deterministic-random";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";

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
