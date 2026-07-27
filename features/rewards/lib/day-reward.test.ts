import assert from "node:assert/strict";
import test from "node:test";
import {
  getDayRewardAmount,
  getDayRewardIdempotencyKey,
} from "@/features/rewards/lib/day-reward";

test("day rewards use the approved server-owned amounts", () => {
  assert.equal(getDayRewardAmount("GLIMMER"), 100);
  assert.equal(getDayRewardAmount("GLOW"), 150);
  assert.equal(getDayRewardAmount("RADIANCE"), 200);
});

test("day reward identity is stable per learner, waypoint, and day", () => {
  const first = getDayRewardIdempotencyKey("user-1", "waypoint-1", "GLOW");
  const retry = getDayRewardIdempotencyKey("user-1", "waypoint-1", "GLOW");

  assert.equal(first, retry);
  assert.notEqual(first, getDayRewardIdempotencyKey("user-1", "waypoint-1", "RADIANCE"));
});
