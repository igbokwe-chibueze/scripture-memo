import type { JourneyStage, WaypointStatus } from "@/lib/generated/prisma/enums";

/** Read-only learner state needed to render one curriculum node on the map. */
export type MapWaypoint = {
  id: string;
  number: number;
  reference: string;
  journeyStage: JourneyStage;
  status: WaypointStatus;
  flameCount: number;
  isCurrent: boolean;
};

/** One ten-waypoint map section rendered independently for predictable performance. */
export type MapWaypointGroup = {
  index: number;
  startNumber: number;
  endNumber: number;
  waypoints: MapWaypoint[];
};
