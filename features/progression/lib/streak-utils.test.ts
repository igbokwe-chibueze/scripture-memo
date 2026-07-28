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
  getStreakForecast,
  getStreakDisplay,
  getStreakLevel,
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
    {
      currentStreak: 1,
      bestStreak: 1,
      lastActiveAt: activity,
      changed: true,
      status: "started",
      isNewBest: true,
      previousBestStreak: 0,
      level: { name: "Spark", minimumDays: 1 },
      reachedNewLevel: true,
    },
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
  assert.equal(result.previousBestStreak, 12);
  assert.equal(result.reachedNewLevel, false);
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

test("level thresholds and the forward forecast remain deterministic", () => {
  assert.equal(getStreakLevel(7).name, "Steady Flame");
  assert.equal(getStreakLevel(60).name, "Inferno");
  assert.equal(getStreakLevel(365).name, "Eternal Light");

  const forecast = getStreakForecast(
    new Date("2026-07-28T12:00:00.000Z"),
    "UTC",
    5,
  );
  assert.equal(forecast.days.length, 7);
  assert.equal(forecast.days[0]?.state, "today");
  assert.equal(forecast.days[2]?.state, "milestone");
  assert.equal(forecast.nextLevel?.name, "Steady Flame");
  assert.equal(forecast.nextLevel?.daysRemaining, 2);

  const distantTarget = getStreakForecast(
    new Date("2026-07-28T12:00:00.000Z"),
    "UTC",
    7,
  );
  assert.equal(distantTarget.nextLevel?.daysRemaining, 7);
  assert.equal(distantTarget.days[6]?.state, "milestone");
  assert.equal(distantTarget.days[6]?.streakDays, 14);
});
