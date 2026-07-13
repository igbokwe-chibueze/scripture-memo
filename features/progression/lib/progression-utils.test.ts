/**
 * Focused unit coverage for UTC cooldown arithmetic and lazy status derivation.
 * Run with `npm run test:progression`; no database or environment secrets are
 * required because every input is an in-memory model-shaped fixture.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  CompletionStatus,
  DayLevel,
  WaypointStatus,
} from "@/lib/generated/prisma/enums";
import type { UserDayProgressModel } from "@/lib/generated/prisma/models/UserDayProgress";
import type { UserWaypointProgressModel } from "@/lib/generated/prisma/models/UserWaypointProgress";
import {
  calculateDay2UnlockTime,
  calculateDay3UnlockTime,
  getNextDayLevel,
  getPreviousDayLevel,
  getWaypointStatusForUser,
  isDayPlayable,
} from "@/features/progression/lib/progression-utils";

/** Builds a complete generated-model fixture while keeping each assertion terse. */
function createDayProgress(
  overrides: Partial<UserDayProgressModel> = {},
): UserDayProgressModel {
  const now = new Date("2026-07-13T10:00:00.000Z");
  return {
    id: "day-progress",
    userId: "user",
    waypointId: "waypoint",
    dayLevel: DayLevel.GLIMMER,
    status: CompletionStatus.NOT_STARTED,
    unlocksAt: null,
    startedAt: null,
    completedAt: null,
    glowPointsAwarded: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("cooldown calculations add exactly 24 elapsed UTC hours", () => {
  const completedAt = new Date("2026-03-29T00:30:00.000Z");
  const expected = "2026-03-30T00:30:00.000Z";
  assert.equal(calculateDay2UnlockTime(completedAt).toISOString(), expected);
  assert.equal(calculateDay3UnlockTime(completedAt).toISOString(), expected);
});

test("a day becomes playable at the exact server unlock instant", () => {
  const unlocksAt = new Date("2026-07-14T10:00:00.000Z");
  const progress = createDayProgress({ unlocksAt });
  assert.equal(isDayPlayable(progress, new Date("2026-07-14T09:59:59.999Z")), false);
  assert.equal(isDayPlayable(progress, unlocksAt), true);
  assert.equal(
    isDayPlayable(
      createDayProgress({ status: CompletionStatus.COMPLETED, unlocksAt: null }),
      unlocksAt,
    ),
    false,
  );
});

test("day ordering and lazy waypoint status remain deterministic", () => {
  assert.equal(getPreviousDayLevel(DayLevel.GLIMMER), null);
  assert.equal(getNextDayLevel(DayLevel.GLIMMER), DayLevel.GLOW);
  assert.equal(getPreviousDayLevel(DayLevel.RADIANCE), DayLevel.GLOW);
  assert.equal(getNextDayLevel(DayLevel.RADIANCE), null);
  assert.equal(getWaypointStatusForUser(null), WaypointStatus.LOCKED);

  const progress = {
    id: "waypoint-progress",
    userId: "user",
    waypointId: "waypoint",
    status: WaypointStatus.COOLDOWN,
    unlockedAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies UserWaypointProgressModel;
  assert.equal(getWaypointStatusForUser(progress), WaypointStatus.COOLDOWN);
});

