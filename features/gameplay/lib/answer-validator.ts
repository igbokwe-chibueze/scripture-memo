/**
 * Produces the comparison form shared by all five gameplay modes.
 *
 * WHY: User input is compared against normalized text, not raw verse text.
 * Lowercasing, removing punctuation, and collapsing whitespace lets “Lord”,
 * “lord,” and “LORD” compare as the same remembered word while retaining every
 * letter and number that affects the actual answer.
 */
export function normalizeGameplayAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Compares one submitted reconstruction with the trusted canonical answer. */
export function isGameplayAnswerCorrect(
  submittedAnswer: string,
  canonicalAnswer: string,
): boolean {
  return normalizeGameplayAnswer(submittedAnswer) ===
    normalizeGameplayAnswer(canonicalAnswer);
}

/**
 * Removes punctuation and clamps one typed word to its normalized target length.
 *
 * Applying this during every change covers typing, paste, and autofill. Canonical
 * punctuation remains rendered outside gameplay inputs, so it is never required
 * from the learner and cannot consume a character slot.
 */
export function limitGameplayWordInput(
  value: string,
  expectedWord: string,
): string {
  return Array.from(
    value.normalize("NFKC").replace(/[^\p{L}\p{N}]/gu, ""),
  )
    .slice(0, Array.from(expectedWord).length)
    .join("");
}
