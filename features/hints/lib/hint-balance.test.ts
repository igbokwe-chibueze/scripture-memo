import assert from "node:assert/strict";
import test from "node:test";
import { calculateHintBalance } from "@/features/hints/lib/hint-balance";

test("free hint balance starts at five and persists usage count", () => {
  assert.equal(calculateHintBalance(0), 5);
  assert.equal(calculateHintBalance(1), 4);
  assert.equal(calculateHintBalance(5), 0);
  assert.equal(calculateHintBalance(9), 0);
});

test("invalid persisted usage counts are rejected", () => {
  assert.throws(() => calculateHintBalance(-1), RangeError);
  assert.throws(() => calculateHintBalance(1.5), RangeError);
});
