/**
 * Unit coverage for timezone-aware, idempotent streak calculation.
 *
 * Run with `npm run test:streaks`. All fixtures are in memory, so this suite
 * requires no database credentials and cannot alter learner data.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateStreakUpdate,
  getStreakDisplay,
  getZonedCalendarDay,
} from "@/features/progression/lib/streak-utils";

test("the first verified activity starts both streak values at one", () => {
  const activity = new Date("2026-07-28T10:00:00.000Z");
  assert.deepEqual(
    calculateStreakUpdate(
      { currentStreak: 0, bestStreak: 0, lastActiveAt: null },
      activity,
      "Africa/Lagos",
    ),
    { currentStreak: 1, bestStreak: 1, lastActiveAt: activity, changed: true },
  );
});

test("another mode on the same local day cannot increment the streak", () => {
  const lastActiveAt = new Date("2026-07-28T00:30:00.000Z");
  assert.equal(
    calculateStreakUpdate(
      { currentStreak: 4, bestStreak: 7, lastActiveAt },
      new Date("2026-07-28T20:00:00.000Z"),
      "Africa/Lagos",
    ).changed,
    false,
  );
});

test("consecutive local days increment and preserve the best streak", () => {
  const result = calculateStreakUpdate(
    {
      currentStreak: 4,
      bestStreak: 8,
      lastActiveAt: new Date("2026-07-28T22:30:00.000Z"),
    },
    new Date("2026-07-29T20:30:00.000Z"),
    "Africa/Lagos",
  );
  assert.equal(result.currentStreak, 5);
  assert.equal(result.bestStreak, 8);
});

test("activity after a missed local day resets current streak to one", () => {
  const result = calculateStreakUpdate(
    {
      currentStreak: 12,
      bestStreak: 12,
      lastActiveAt: new Date("2026-07-20T12:00:00.000Z"),
    },
    new Date("2026-07-28T12:00:00.000Z"),
    "UTC",
  );
  assert.equal(result.currentStreak, 1);
  assert.equal(result.bestStreak, 12);
  assert.equal(getStreakDisplay(result.currentStreak), "🔥 1-day streak");
});

test("calendar arithmetic follows timezone boundaries and falls back to UTC", () => {
  const instant = new Date("2026-07-28T23:30:00.000Z");
  assert.equal(
    getZonedCalendarDay(instant, "Africa/Lagos"),
    getZonedCalendarDay(new Date("2026-07-29T12:00:00.000Z"), "UTC"),
  );
  assert.equal(
    getZonedCalendarDay(instant, "Not/A-Timezone"),
    getZonedCalendarDay(instant, "UTC"),
  );
});
