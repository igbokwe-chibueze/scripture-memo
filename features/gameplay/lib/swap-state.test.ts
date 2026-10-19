/** Regression: learners cannot distinguish duplicate tiles by hidden occurrence IDs. */
import assert from "node:assert/strict";
import test from "node:test";
import { tokenizeVerse } from "./verse-tokenizer";
import { isGameplayAnswerCorrect } from "./answer-validator";
import {
  areSwapTokensCorrect,
  getIncorrectSwapPositions,
  reconstructSwapAnswer,
  swapTokenPositions,
  type SwapToken,
} from "./swap-generator";

/** A solved board whose identities can be exchanged using the real interaction. */
function solvedBoard(text: string): SwapToken[] {
  return tokenizeVerse(text).map((token) => ({
    position: token.index,
    originalIndex: token.index,
    text: token.wordText,
    isSwappable: true,
  }));
}

test("John 3:16 accepts either identical 'that' occurrence and agrees with server text validation", () => {
  const text = "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
  const canonical = tokenizeVerse(text);
  const positions = canonical.filter((token) => token.normalizedText === "that").map((token) => token.index);
  assert.equal(positions.length, 2);
  const swappedDuplicates = swapTokenPositions(solvedBoard(text), positions[0], positions[1]);
  assert.notEqual(swappedDuplicates[positions[0]].originalIndex, positions[0]);
  assert.deepEqual(getIncorrectSwapPositions(swappedDuplicates, canonical), []);
  assert.equal(areSwapTokensCorrect(swappedDuplicates, canonical), true);
  assert.equal(isGameplayAnswerCorrect(reconstructSwapAnswer(swappedDuplicates, canonical), text), true);

  // Equivalent duplicates must not hide genuinely incorrect neighboring words.
  const wrong = swapTokenPositions(swappedDuplicates, 1, 3);
  assert.deepEqual(getIncorrectSwapPositions(wrong, canonical), [1, 3]);
  assert.equal(areSwapTokensCorrect(wrong, canonical), false);
  assert.equal(isGameplayAnswerCorrect(reconstructSwapAnswer(wrong, canonical), text), false);
});

test("case-equivalent duplicates keep canonical punctuation and an incomplete board fails", () => {
  const text = "That, that THAT.";
  const canonical = tokenizeVerse(text);
  const swapped = swapTokenPositions(solvedBoard(text), 0, 2);
  assert.deepEqual(getIncorrectSwapPositions(swapped, canonical), []);
  assert.equal(areSwapTokensCorrect(swapped, canonical), true);
  assert.equal(reconstructSwapAnswer(swapped, canonical), "THAT, that That.");
  assert.equal(isGameplayAnswerCorrect(reconstructSwapAnswer(swapped, canonical), text), true);
  assert.equal(areSwapTokensCorrect(swapped.slice(0, 2), canonical), false);
});
