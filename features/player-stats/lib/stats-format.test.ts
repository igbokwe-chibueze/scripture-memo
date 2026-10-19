/** Recorded outcomes, rather than abandoned work, define a completion rate. */
import assert from "node:assert/strict";
import test from "node:test";
import { formatStatsDuration, getModeTotals } from "./stats-format";
import { playerStatsFilterSchema } from "../schemas/player-stats.schema";

test("unfinished attempts are excluded from the completion-rate denominator", () => {
  const totals = getModeTotals([
    {
      mode: "CUE",
      completed: 2,
      learning: 1,
      practice: 1,
      failed: 1,
      expired: 1,
      inProgress: 8,
      firstTry: 1,
      recordedMs: 6000,
      timedAttempts: 4,
      fastestMs: 1000,
      averageMs: 1500,
    },
  ]);
  assert.equal(totals.completionRate, 0.5);
  assert.equal(totals.unfinished, 8);
  assert.equal(getModeTotals([]).completionRate, null);
});

test("unknown time is distinct from a recorded zero-duration attempt", () => {
  assert.equal(formatStatsDuration(null, "en"), "—");
  assert.match(formatStatsDuration(0, "en"), /0/);
  assert.match(formatStatsDuration(61_000, "en"), /1.*1/);
});

test("period filters cannot become an external account selector", () => {
  assert.deepEqual(playerStatsFilterSchema.parse({ userId: "another-user" }), {
    year: "recent",
  });
  assert.equal(playerStatsFilterSchema.parse({ year: "2024" }).year, 2024);
  assert.equal(playerStatsFilterSchema.parse({ year: "10000" }).year, "recent");
  assert.equal(
    playerStatsFilterSchema.parse({ year: ["2024", "2025"] }).year,
    "recent",
  );
});
