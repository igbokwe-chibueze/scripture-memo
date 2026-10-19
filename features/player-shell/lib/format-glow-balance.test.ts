/** Boundaries must never advertise Glow Points the learner cannot spend. */
import assert from "node:assert/strict";
import test from "node:test";
import { formatGlowBalance } from "./format-glow-balance";

test("Glow balances stay exact below one thousand and truncate larger values", () => {
  for (const [value, expected] of [
    [0, "0"], [975, "975"], [999, "999"], [1000, "1K+"],
    [1275, "1.2K+"], [1999, "1.9K+"], [999999, "999.9K+"],
    [1275000, "1.2M+"],
  ] as const) {
    assert.equal(formatGlowBalance(value, "en"), expected);
  }
});
