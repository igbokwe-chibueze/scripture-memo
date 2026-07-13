import type { JourneyStage } from "@/lib/generated/prisma/enums";

export type AssignWaypointResult = "assigned" | "verse-unavailable" | "waypoint-missing";

export type WaypointSeedData = {
  number: number;
  journeyStage: JourneyStage;
  isActive: false;
};
