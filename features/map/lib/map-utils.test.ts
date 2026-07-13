import assert from "node:assert/strict";
import test from "node:test";
import { JourneyStage, WaypointStatus } from "@/lib/generated/prisma/enums";
import { groupMapWaypoints, markCurrentMapWaypoint } from "@/features/map/lib/map-utils";
import type { MapWaypoint } from "@/features/map/types/map.types";

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
  const marked = markCurrentMapWaypoint([
    createWaypoint(1, WaypointStatus.COMPLETED),
    createWaypoint(2, WaypointStatus.IN_PROGRESS),
    createWaypoint(4, WaypointStatus.UNLOCKED),
    createWaypoint(5, WaypointStatus.LOCKED),
  ]);

  assert.deepEqual(marked.filter(({ isCurrent }) => isCurrent).map(({ number }) => number), [2]);
});

test("does not invent a current waypoint when every published node is complete or locked", () => {
  const marked = markCurrentMapWaypoint([
    createWaypoint(1, WaypointStatus.COMPLETED),
    createWaypoint(2, WaypointStatus.LOCKED),
  ]);

  assert.equal(marked.some(({ isCurrent }) => isCurrent), false);
});

test("groups an expanding curriculum in ordered sets of ten", () => {
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
