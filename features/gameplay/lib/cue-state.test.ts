import assert from "node:assert/strict";
import test from "node:test";
import {
  generateCueHiddenTokenIndexes,
  getCueWordParts,
  getIncorrectCuePositions,
  isCueAnswerCorrect,
  limitCueInput,
  reconstructCueAnswer,
} from "@/features/gameplay/lib/cue-state";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";

test("Cue positions remain deterministic and include one-letter words", () => {
  const tokens = tokenizeVerse("I am the Alpha and Omega");
  const first = generateCueHiddenTokenIndexes(tokens, 100, "cue-session");
  const retry = generateCueHiddenTokenIndexes(tokens, 100, "cue-session");

  assert.deepEqual(first, retry);
  assert.deepEqual(first, [0, 1, 2, 3, 4, 5]);
});

test("Cue provides a first-letter placeholder and normalized full target", () => {
  const token = tokenizeVerse("Lord,")[0];
  assert.ok(token);
  assert.deepEqual(getCueWordParts(token), {
    firstLetter: "L",
    expectedWord: "lord",
  });
});

test("Cue input strips punctuation and clamps pasted extra characters", () => {
  assert.equal(limitCueInput("kindsss", "kind"), "kind");
  assert.equal(limitCueInput("K-I-N-D", "kind"), "KIND");
});

test("Cue validation is case-insensitive and punctuation-tolerant", () => {
  const token = tokenizeVerse("You're")[0];
  assert.ok(token);

  assert.equal(isCueAnswerCorrect(token, "YOURE"), true);
  assert.equal(isCueAnswerCorrect(token, "y-o-u-r-e"), true);
  assert.equal(isCueAnswerCorrect(token, "oure"), false);
});

test("Cue feedback tracks positions and reconstruction anchors punctuation", () => {
  const tokens = tokenizeVerse("“Love,” is kind...");
  const hidden = [0, 2];
  const incomplete = { 0: "Love" };
  const complete = { 0: "Love", 2: "kind" };

  assert.deepEqual(getIncorrectCuePositions(tokens, hidden, incomplete), [2]);
  assert.deepEqual(getIncorrectCuePositions(tokens, hidden, complete), []);
  assert.equal(
    reconstructCueAnswer(tokens, hidden, complete),
    "“Love,” is kind...",
  );
});
