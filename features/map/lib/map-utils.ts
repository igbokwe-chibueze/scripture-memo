import { WaypointStatus } from "@/lib/generated/prisma/enums";
import type { MapWaypoint, MapWaypointGroup } from "@/features/map/types/map.types";

export const MAP_GROUP_SIZE = 10;

/**
 * Marks the lowest playable, unfinished waypoint as the learner's current node.
 * The repository order is preserved so curriculum numbering gaps remain valid.
 */
export function markCurrentMapWaypoint(
  waypoints: Omit<MapWaypoint, "isCurrent">[],
): MapWaypoint[] {
  const currentId = waypoints.find(
    ({ status }) => status !== WaypointStatus.LOCKED && status !== WaypointStatus.COMPLETED,
  )?.id;

  return waypoints.map((waypoint) => ({
    ...waypoint,
    isCurrent: waypoint.id === currentId,
  }));
}

/** Splits an expanding curriculum into stable ten-node sections without a maximum. */
export function groupMapWaypoints(waypoints: MapWaypoint[]): MapWaypointGroup[] {
  const groups: MapWaypointGroup[] = [];

  for (let offset = 0; offset < waypoints.length; offset += MAP_GROUP_SIZE) {
    const groupWaypoints = waypoints.slice(offset, offset + MAP_GROUP_SIZE);
    const first = groupWaypoints[0];
    const last = groupWaypoints.at(-1);

    // The loop only creates groups from non-empty slices. This guard also keeps
    // the helper safe if its batching logic is changed during later map work.
    if (!first || !last) continue;

    groups.push({
      index: groups.length,
      startNumber: first.number,
      endNumber: last.number,
      waypoints: groupWaypoints,
    });
  }

  return groups;
}
