import assert from "node:assert/strict";
import test from "node:test";
import {
  getIncorrectFillPositions,
  isFillAnswerCorrect,
  reconstructFillAnswer,
} from "@/features/gameplay/lib/fill-state";
import { limitGameplayWordInput } from "@/features/gameplay/lib/answer-validator";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";

test("Fill validates complete words without case or canonical punctuation", () => {
  const token = tokenizeVerse("Lord,")[0];
  assert.ok(token);

  assert.equal(isFillAnswerCorrect(token, "LORD"), true);
  assert.equal(isFillAnswerCorrect(token, "lord,"), true);
  assert.equal(isFillAnswerCorrect(token, "lor"), false);
});

test("Fill clamps typing and pasted text to the exact normalized length", () => {
  assert.equal(limitGameplayWordInput("patienttt", "patient"), "patient");
  assert.equal(limitGameplayWordInput("P-A-T-I-E-N-T", "patient"), "PATIENT");
});

test("Fill reports each incomplete position and anchors punctuation", () => {
  const tokens = tokenizeVerse("“Love,” is patient.");
  const hidden = [0, 2];
  const incomplete = { 0: "Love" };
  const complete = { 0: "Love", 2: "patient" };

  assert.deepEqual(getIncorrectFillPositions(tokens, hidden, incomplete), [2]);
  assert.deepEqual(getIncorrectFillPositions(tokens, hidden, complete), []);
  assert.equal(
    reconstructFillAnswer(tokens, hidden, complete),
    "“Love,” is patient.",
  );
});
