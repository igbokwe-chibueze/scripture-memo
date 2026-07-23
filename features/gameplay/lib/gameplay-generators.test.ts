import assert from "node:assert/strict";
import test from "node:test";
import {
  isGameplayAnswerCorrect,
  normalizeGameplayAnswer,
} from "@/features/gameplay/lib/answer-validator";
import {
  generateHiddenTokenIndexes,
  getSessionHiddenPercent,
} from "@/features/gameplay/lib/hidden-word-generator";
import { generateVersePhrases } from "@/features/gameplay/lib/phrase-generator";
import {
  areSwapTokensCorrect,
  generateSwapTokens,
} from "@/features/gameplay/lib/swap-generator";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";

test("normalizes case, punctuation, Unicode width, and repeated whitespace", () => {
  assert.equal(normalizeGameplayAnswer("  LORD,   you’re good! "), "lord youre good");
  assert.equal(isGameplayAnswerCorrect("In the BEGINNING", "In the beginning."), true);
});

test("tokenizer preserves duplicate occurrence positions", () => {
  const tokens = tokenizeVerse("the Lord is my Lord");
  assert.deepEqual(tokens.map(({ index, normalizedText }) => [index, normalizedText]), [
    [0, "the"],
    [1, "lord"],
    [2, "is"],
    [3, "my"],
    [4, "lord"],
  ]);
});

test("hidden positions are deterministic and respect the requested count", () => {
  const tokens = tokenizeVerse("one two three four five six seven eight nine ten");
  const first = generateHiddenTokenIndexes(tokens, 35, "verse:waypoint:glimmer");
  const retry = generateHiddenTokenIndexes(tokens, 35, "verse:waypoint:glimmer");

  assert.deepEqual(first, retry);
  assert.equal(first.length, 4);
});

test("tokenizer keeps surrounding punctuation out of gameplay word tiles", () => {
  const tokens = tokenizeVerse("“Love,” is kind...");
  assert.deepEqual(
    tokens.map(({ wordText, leadingPunctuation, trailingPunctuation }) => ({
      wordText,
      leadingPunctuation,
      trailingPunctuation,
    })),
    [
      { wordText: "Love", leadingPunctuation: "“", trailingPunctuation: ",”" },
      { wordText: "is", leadingPunctuation: "", trailingPunctuation: "" },
      { wordText: "kind", leadingPunctuation: "", trailingPunctuation: "..." },
    ],
  );
});

test("day difficulty percentage is stable and remains within its product range", () => {
  const first = getSessionHiddenPercent("GLIMMER", "session-1");
  const retry = getSessionHiddenPercent("GLIMMER", "session-1");
  assert.equal(first, retry);
  assert.equal(first >= 20 && first <= 35, true);
});

test("phrase boundaries remain deterministic and avoid tiny trailing chunks", () => {
  const tokens = tokenizeVerse(
    "one two three four five six seven eight nine ten eleven twelve thirteen fourteen",
  );
  const first = generateVersePhrases(tokens, "stable-session-seed");
  const retry = generateVersePhrases(tokens, "stable-session-seed");

  assert.deepEqual(first, retry);
  assert.equal(first.every((phrase) => {
    const size = phrase.endTokenIndex - phrase.startTokenIndex + 1;
    return size >= 3 && size <= 6;
  }), true);
});

test("swap generation tracks duplicate words by position and can be restored", () => {
  const tokens = tokenizeVerse("the Lord is my Lord");
  const swapped = generateSwapTokens(tokens, 100, "duplicate-safe-seed");

  assert.equal(areSwapTokensCorrect(swapped), false);
  assert.deepEqual(
    swapped.map(({ originalIndex }) => originalIndex).sort((left, right) => left - right),
    [0, 1, 2, 3, 4],
  );
  assert.equal(
    areSwapTokensCorrect(tokens.map(({ index, text }) => ({
      position: index,
      originalIndex: index,
      text,
      isSwappable: true,
    }))),
    true,
  );
});
