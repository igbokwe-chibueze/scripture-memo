import { normalizeGameplayAnswer } from "@/features/gameplay/lib/answer-validator";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";

export type FillAnswers = Readonly<Record<number, string>>;

/** Validates one complete typed word against its canonical normalized token. */
export function isFillAnswerCorrect(
  token: VerseToken,
  answer: string,
): boolean {
  return normalizeGameplayAnswer(answer) === token.normalizedText;
}

/** Returns every hidden token position that is incomplete or incorrect. */
export function getIncorrectFillPositions(
  tokens: readonly VerseToken[],
  hiddenTokenIndexes: readonly number[],
  answers: FillAnswers,
): number[] {
  return hiddenTokenIndexes.filter((tokenIndex) => {
    const token = tokens[tokenIndex];
    return !token || !isFillAnswerCorrect(token, answers[tokenIndex] ?? "");
  });
}

/**
 * Reconstructs the complete typed verse for trusted server-side comparison.
 *
 * Punctuation stays at its canonical position and missing fields remain empty,
 * so browser state cannot turn an incomplete Fill attempt into a valid claim.
 */
export function reconstructFillAnswer(
  tokens: readonly VerseToken[],
  hiddenTokenIndexes: readonly number[],
  answers: FillAnswers,
): string {
  const hidden = new Set(hiddenTokenIndexes);
  return tokens
    .map((token) => {
      if (!hidden.has(token.index)) return token.text;
      return `${token.leadingPunctuation}${answers[token.index] ?? ""}${token.trailingPunctuation}`;
    })
    .join(" ");
}
