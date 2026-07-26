import { deterministicShuffle } from "@/features/gameplay/lib/deterministic-random";
import { normalizeGameplayAnswer } from "@/features/gameplay/lib/answer-validator";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";

export type CueAnswers = Readonly<Record<number, string>>;

/** Display and comparison data for one first-letter Cue input. */
export type CueWordParts = {
  firstLetter: string;
  expectedWord: string;
};

/**
 * Selects deterministic Cue positions across every normalized word occurrence.
 *
 * The first letter is now a placeholder rather than fixed input, so even a
 * one-letter word still requires an explicit learner response.
 */
export function generateCueHiddenTokenIndexes(
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
  return deterministicShuffle(eligibleIndexes, `${seed}:cue-positions`)
    .slice(0, hiddenCount)
    .sort((left, right) => left - right);
}

/**
 * Provides the visual first-letter cue and normalized complete target word.
 *
 * The cue preserves the translation's casing but is only a placeholder. The
 * learner enters the complete word, while normalized comparison ensures the
 * canonical verse's punctuation never causes a false failure.
 */
export function getCueWordParts(token: VerseToken): CueWordParts {
  const visibleCharacters = Array.from(token.wordText);
  return {
    firstLetter: visibleCharacters[0] ?? "",
    expectedWord: token.normalizedText,
  };
}

/**
 * Removes punctuation and clamps Cue input to the exact normalized word length.
 *
 * This applies to typing, paste, and autofill alike, preventing extra letters
 * such as `kindsss` from ever entering a four-letter `kind` field.
 */
export function limitCueInput(value: string, expectedWord: string): string {
  return Array.from(
    value.normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, ""),
  )
    .slice(0, Array.from(expectedWord).length)
    .join("");
}

/** Validates one Cue response with the shared punctuation-tolerant normalizer. */
export function isCueAnswerCorrect(
  token: VerseToken,
  answer: string,
): boolean {
  return normalizeGameplayAnswer(answer) === token.normalizedText;
}

/** Returns every hidden token position that is incomplete or incorrect. */
export function getIncorrectCuePositions(
  tokens: readonly VerseToken[],
  hiddenTokenIndexes: readonly number[],
  answers: CueAnswers,
): number[] {
  return hiddenTokenIndexes.filter((tokenIndex) => {
    const token = tokens[tokenIndex];
    return !token || !isCueAnswerCorrect(token, answers[tokenIndex] ?? "");
  });
}

/**
 * Reconstructs a complete verse-shaped answer for trusted server validation.
 *
 * Punctuation remains anchored to its canonical slot. Missing answers remain
 * incomplete, ensuring browser state alone can never claim mode completion.
 */
export function reconstructCueAnswer(
  tokens: readonly VerseToken[],
  hiddenTokenIndexes: readonly number[],
  answers: CueAnswers,
): string {
  const hidden = new Set(hiddenTokenIndexes);
  return tokens
    .map((token) => {
      if (!hidden.has(token.index)) return token.text;
      return `${token.leadingPunctuation}${answers[token.index] ?? ""}${token.trailingPunctuation}`;
    })
    .join(" ");
}
