/** Deterministic calendar tests cover timezone boundaries, leap years and zero-activity days. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  activityLevel,
  activityMonths,
  activityWeeks,
  fillActivityDays,
  getActivityRange,
} from "./activity-calendar";

test("rolling calendar follows the account's local day at a UTC year boundary", () => {
  const range = getActivityRange(
    "recent",
    new Date("2026-01-01T00:30:00Z"),
    "America/Los_Angeles",
  );
  assert.deepEqual(range, {
    start: "2025-01-01",
    end: "2025-12-31",
    today: "2025-12-31",
  });
});

test("leap-day rolling windows clamp anniversaries without omitting February 29", () => {
  const range = getActivityRange(
    "recent",
    new Date("2024-02-29T18:00:00Z"),
    "UTC",
  );
  assert.equal(range.start, "2023-03-01");
  assert.equal(fillActivityDays(range.start, range.end, []).length, 366);
  assert.equal(
    getActivityRange(2024, new Date("2026-10-19T00:00:00Z"), "UTC").end,
    "2024-12-31",
  );
});

test("calendar days use civil-date arithmetic across DST and include inactive days", () => {
  const days = fillActivityDays("2026-03-07", "2026-03-10", [
    { date: "2026-03-08", learning: 1, practice: 2 },
  ]);
  assert.deepEqual(
    days.map((day) => day.date),
    ["2026-03-07", "2026-03-08", "2026-03-09", "2026-03-10"],
  );
  assert.equal(days[0].learning, 0);
  assert.equal(days[1].practice, 2);
});

test("week padding is Monday-first and never invents activity", () => {
  const weeks = activityWeeks(fillActivityDays("2026-01-01", "2026-01-03", []));
  assert.equal(weeks.length, 1);
  assert.equal(weeks[0].length, 7);
  assert.equal(weeks[0][0], null);
  assert.equal(weeks[0][3]?.date, "2026-01-01");
  assert.equal(weeks[0][6], null);
});

test("intensity thresholds are stable and month navigation includes partial months", () => {
  assert.deepEqual(
    [0, 1, 4, 5, 9, 10, 19, 20].map(activityLevel),
    [0, 1, 1, 2, 2, 3, 3, 4],
  );
  assert.deepEqual(activityMonths("2025-12-20", "2026-02-19"), [
    "2025-12",
    "2026-01",
    "2026-02",
  ]);
  assert.equal(
    getActivityRange("recent", new Date("2026-01-01T00:00:00Z"), "invalid-zone")
      .today,
    "2026-01-01",
  );
});
