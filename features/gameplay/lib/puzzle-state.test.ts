import assert from "node:assert/strict";
import test from "node:test";
import { generateVersePhrases } from "@/features/gameplay/lib/phrase-generator";
import {
  createPuzzlePhraseBank,
  generateHiddenPhraseIndexes,
  getIncorrectPuzzleSlots,
  placePuzzlePhrase,
  reconstructPuzzleAnswer,
  removePuzzlePlacement,
} from "@/features/gameplay/lib/puzzle-state";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";

test("phrase visibility and bank order remain deterministic across retries", () => {
  const phrases = generateVersePhrases(
    tokenizeVerse(
      "one two three four five six seven eight nine ten eleven twelve thirteen fourteen",
    ),
    "stable-boundaries",
    "GLOW",
  );
  const firstHidden = generateHiddenPhraseIndexes(phrases, 60, "session-puzzle");
  const retryHidden = generateHiddenPhraseIndexes(phrases, 60, "session-puzzle");

  assert.deepEqual(firstHidden, retryHidden);
  assert.deepEqual(
    createPuzzlePhraseBank(firstHidden, "session-puzzle"),
    createPuzzlePhraseBank(retryHidden, "session-puzzle"),
  );
  assert.equal(firstHidden.length, Math.ceil(phrases.length * 0.6));
});

test("placing, moving, and returning phrases preserves one-to-one assignments", () => {
  let placements = placePuzzlePhrase({}, 2, 0);
  placements = placePuzzlePhrase(placements, 2, 2);
  assert.deepEqual(placements, { 2: 2 });
  placements = removePuzzlePlacement(placements, 2);
  assert.deepEqual(placements, {});
});

test("validation tracks duplicate phrase occurrences by original position", () => {
  const phrases = [
    { index: 0, startTokenIndex: 0, endTokenIndex: 2, text: "the Lord remains" },
    { index: 1, startTokenIndex: 3, endTokenIndex: 5, text: "the Lord remains" },
  ];
  const hidden = [0, 1];
  const swapped = placePuzzlePhrase(placePuzzlePhrase({}, 1, 0), 0, 1);

  assert.deepEqual(getIncorrectPuzzleSlots(hidden, swapped), [0, 1]);

  const correct = placePuzzlePhrase(placePuzzlePhrase({}, 0, 0), 1, 1);
  assert.deepEqual(getIncorrectPuzzleSlots(hidden, correct), []);
  assert.equal(
    reconstructPuzzleAnswer(phrases, hidden, correct),
    "the Lord remains the Lord remains",
  );
});

test("incomplete puzzle reconstruction cannot match the canonical verse", () => {
  const phrases = generateVersePhrases(
    tokenizeVerse("Love is patient and kind and rejoices with truth"),
    "incomplete-boundaries",
    "GLOW",
  );
  const hidden = phrases.map(({ index }) => index);

  assert.notEqual(
    reconstructPuzzleAnswer(phrases, hidden, {}),
    phrases.map(({ text }) => text).join(" "),
  );
});

test("short-verse minimums make Glow and Radiance progressively substantial", () => {
  const phrases = generateVersePhrases(
    tokenizeVerse("Love is patient and kind"),
    "short-boundaries",
    "GLOW",
  );

  assert.equal(
    generateHiddenPhraseIndexes(phrases, 40, "short-glow", 2).length,
    2,
  );
  assert.equal(
    generateHiddenPhraseIndexes(phrases, 70, "short-radiance", phrases.length).length,
    3,
  );
});
