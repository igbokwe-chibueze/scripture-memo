import assert from "node:assert/strict";
import test from "node:test";
import {
  createDragDropWordBank,
  getIncorrectDragDropSlots,
  placeDragDropToken,
  reconstructDragDropAnswer,
  removeDragDropPlacement,
} from "@/features/gameplay/lib/drag-drop-state";
import { tokenizeVerse } from "@/features/gameplay/lib/verse-tokenizer";

test("word bank remains deterministic and preserves duplicate token identities", () => {
  const first = createDragDropWordBank([0, 2, 4, 6], "session-1");
  const second = createDragDropWordBank([0, 2, 4, 6], "session-1");
  assert.deepEqual(first, second);
  assert.deepEqual([...first].sort((a, b) => a - b), [0, 2, 4, 6]);
});

test("placing, moving, and returning tokens preserves a one-to-one assignment", () => {
  let placements = placeDragDropToken({}, 2, 4);
  placements = placeDragDropToken(placements, 2, 2);
  assert.deepEqual(placements, { 2: 2 });
  placements = removeDragDropPlacement(placements, 2);
  assert.deepEqual(placements, {});
});

test("validation and reconstruction use original token positions", () => {
  const tokens = tokenizeVerse("the Lord is my Lord");
  const hidden = [1, 4];
  const swapped = placeDragDropToken(placeDragDropToken({}, 4, 1), 1, 4);
  assert.deepEqual(getIncorrectDragDropSlots(hidden, swapped), [1, 4]);
  assert.equal(reconstructDragDropAnswer(tokens, hidden, swapped), "the Lord is my Lord");

  const correct = placeDragDropToken(placeDragDropToken({}, 1, 1), 4, 4);
  assert.deepEqual(getIncorrectDragDropSlots(hidden, correct), []);
  assert.equal(reconstructDragDropAnswer(tokens, hidden, correct), "the Lord is my Lord");
});
