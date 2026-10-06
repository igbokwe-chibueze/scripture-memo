import assert from "node:assert/strict";
import test from "node:test";
import {
  CompletionStatus,
  DayLevel,
  GameMode,
} from "@/lib/generated/prisma/enums";
import { buildDayCards } from "@/features/waypoints/lib/day-selection";

/** Pure status tests never connect to either application database. */
test("derives ready, locked, cooldown, and complete states from persisted timestamps", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const initial = buildDayCards([], now);
  assert.deepEqual(initial.map(({ status }) => status), ["READY", "LOCKED", "LOCKED"]);
  assert.deepEqual(initial.map(({ reward }) => reward), [100, 150, 200]);

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

test("shows rewards derived from the current platform base amount", () => {
  const cards = buildDayCards([], new Date("2026-07-22T12:00:00.000Z"), 120);
  assert.deepEqual(cards.map(({ reward }) => reward), [120, 180, 240]);
});

test("keeps the original recorded reward visible for completed days", () => {
  const cards = buildDayCards(
    [
      {
        dayLevel: DayLevel.GLIMMER,
        status: CompletionStatus.COMPLETED,
        unlocksAt: null,
        glowPointsAwarded: 100,
      },
    ],
    new Date("2026-07-22T12:00:00.000Z"),
    120,
  );

  assert.equal(cards[0]?.reward, 100);
  assert.equal(cards[1]?.reward, 180);
});

test("exposes only persisted completed modes on the completed day card", () => {
  const cards = buildDayCards(
    [
      {
        dayLevel: DayLevel.GLIMMER,
        status: CompletionStatus.COMPLETED,
        unlocksAt: null,
        completedSessionId: "completed-session",
        completedModes: [GameMode.DRAG_DROP, GameMode.PUZZLE],
      },
    ],
    new Date("2026-07-22T12:00:00.000Z"),
  );

  assert.deepEqual(cards[0]?.completedModes, [
    GameMode.DRAG_DROP,
    GameMode.PUZZLE,
  ]);
  assert.deepEqual(cards[1]?.completedModes, []);
  assert.deepEqual(cards[2]?.completedModes, []);
});
