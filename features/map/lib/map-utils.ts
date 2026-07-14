import { WaypointStatus } from "@/lib/generated/prisma/enums";
import type { MapWaypoint, MapWaypointGroup } from "@/features/map/types/map.types";

/**
 * Product-approved section size. Keeping this in a pure module lets both visual
 * variants group identically without coupling either component to the number.
 */
export const MAP_GROUP_SIZE = 10;

/**
 * Marks the lowest playable, unfinished waypoint as the learner's current node.
 *
 * Input must already be in repository curriculum order. We deliberately find by
 * array order rather than number arithmetic because published numbering gaps are
 * valid. COMPLETED nodes are historical and LOCKED nodes are not playable, so
 * neither can be the active resume target. If every node is completed or locked,
 * no current marker is invented.
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

/**
 * Splits an expanding curriculum into stable ten-node sections without a cap.
 *
 * `slice` preserves the repository's authoritative order and naturally supports
 * a final partial group. Only one returned group is mounted by either map at a
 * time, preventing the initial 220 nodes—and future appended nodes—from becoming
 * one oversized DOM tree.
 */
export function groupMapWaypoints(waypoints: MapWaypoint[]): MapWaypointGroup[] {
  const groups: MapWaypointGroup[] = [];

  // Offset iteration is deterministic and avoids mutating the source array that
  // is shared by both A/B presentations.
  for (let offset = 0; offset < waypoints.length; offset += MAP_GROUP_SIZE) {
    const groupWaypoints = waypoints.slice(offset, offset + MAP_GROUP_SIZE);
    const first = groupWaypoints[0];
    const last = groupWaypoints.at(-1);

    // The loop only creates groups from non-empty slices. This guard also keeps
    // the helper safe if its batching logic is changed during later map work.
    if (!first || !last) continue;

    groups.push({
      // Use the accumulated length rather than offset arithmetic so the index
      // remains correct even if empty groups are ever filtered in the future.
      index: groups.length,
      startNumber: first.number,
      endNumber: last.number,
      waypoints: groupWaypoints,
    });
  }

  return groups;
}
