import assert from "node:assert/strict";
import test from "node:test";
import { JourneyStage, WaypointStatus } from "@/lib/generated/prisma/enums";
import { groupMapWaypoints, markCurrentMapWaypoint } from "@/features/map/lib/map-utils";
import type { MapWaypoint } from "@/features/map/types/map.types";

/**
 * Pure unit coverage for grouping and current-position derivation. In-memory
 * fixtures ensure this suite cannot read, reset, seed, or migrate any database.
 */

/** Creates compact deterministic map fixtures without touching either database. */
function createWaypoint(number: number, status: WaypointStatus): Omit<MapWaypoint, "isCurrent"> {
  return {
    id: `waypoint-${number}`,
    number,
    reference: `Test ${number}:1`,
    journeyStage: JourneyStage.LEARN,
    status,
    flameCount: status === WaypointStatus.COMPLETED ? 3 : 0,
  };
}

test("marks the lowest playable unfinished waypoint as current", () => {
  // The numbering gap proves selection follows ordered published data rather
  // than assuming every integer waypoint exists.
  const marked = markCurrentMapWaypoint([
    createWaypoint(1, WaypointStatus.COMPLETED),
    createWaypoint(2, WaypointStatus.IN_PROGRESS),
    createWaypoint(4, WaypointStatus.UNLOCKED),
    createWaypoint(5, WaypointStatus.LOCKED),
  ]);

  assert.deepEqual(marked.filter(({ isCurrent }) => isCurrent).map(({ number }) => number), [2]);
});

test("does not invent a current waypoint when every published node is complete or locked", () => {
  // A fabricated marker could incorrectly invite navigation to an invalid node.
  const marked = markCurrentMapWaypoint([
    createWaypoint(1, WaypointStatus.COMPLETED),
    createWaypoint(2, WaypointStatus.LOCKED),
  ]);

  assert.equal(marked.some(({ isCurrent }) => isCurrent), false);
});

test("groups an expanding curriculum in ordered sets of ten", () => {
  // Twenty-three items cover two full groups and one partial group, proving the
  // algorithm has no obsolete 220-waypoint ceiling.
  const waypoints = markCurrentMapWaypoint(
    Array.from({ length: 23 }, (_, index) => createWaypoint(index + 1, WaypointStatus.LOCKED)),
  );
  const groups = groupMapWaypoints(waypoints);

  assert.equal(groups.length, 3);
  assert.deepEqual(groups.map(({ startNumber, endNumber }) => [startNumber, endNumber]), [
    [1, 10],
    [11, 20],
    [21, 23],
  ]);
  assert.deepEqual(groups.map(({ waypoints: items }) => items.length), [10, 10, 3]);
});

test("supports Map A's independent five-waypoint illustration groups", () => {
  const waypoints = markCurrentMapWaypoint(
    Array.from({ length: 12 }, (_, index) => createWaypoint(index + 1, WaypointStatus.LOCKED)),
  );
  const groups = groupMapWaypoints(waypoints, 5);

  assert.deepEqual(groups.map(({ startNumber, endNumber }) => [startNumber, endNumber]), [
    [1, 5],
    [6, 10],
    [11, 12],
  ]);
});

test("rejects an invalid group size before offset iteration", () => {
  assert.throws(() => groupMapWaypoints([], 0), /positive integer/);
});
