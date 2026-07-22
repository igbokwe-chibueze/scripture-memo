import assert from "node:assert/strict";
import test from "node:test";
import { CompletionStatus, DayLevel } from "@/lib/generated/prisma/enums";
import { buildDayCards } from "@/features/waypoints/lib/day-selection";

/** Pure status tests never connect to either application database. */
test("derives ready, locked, cooldown, and complete states from persisted timestamps", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const initial = buildDayCards([], now);
  assert.deepEqual(initial.map(({ status }) => status), ["READY", "LOCKED", "LOCKED"]);

  const afterGlimmer = buildDayCards([
    { dayLevel: DayLevel.GLIMMER, status: CompletionStatus.COMPLETED, unlocksAt: null },
    {
      dayLevel: DayLevel.GLOW,
      status: CompletionStatus.NOT_STARTED,
      unlocksAt: new Date("2026-07-23T12:00:00.000Z"),
    },
  ], now);
  assert.deepEqual(afterGlimmer.map(({ status }) => status), ["COMPLETE", "COOLDOWN", "LOCKED"]);
});

test("makes an elapsed cooldown ready without trusting a client-provided flag", () => {
  const cards = buildDayCards([
    { dayLevel: DayLevel.GLIMMER, status: CompletionStatus.COMPLETED, unlocksAt: null },
    {
      dayLevel: DayLevel.GLOW,
      status: CompletionStatus.NOT_STARTED,
      unlocksAt: new Date("2026-07-22T11:59:59.000Z"),
    },
  ], new Date("2026-07-22T12:00:00.000Z"));

  assert.equal(cards[1]?.status, "READY");
});
