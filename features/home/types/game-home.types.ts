import type { JourneyStage } from "@/lib/generated/prisma/enums";

/** Minimal server-authorized waypoint context for the Game Home resume action. */
export type GameHomeWaypoint = {
  id: string;
  number: number;
  journeyStage: JourneyStage;
  reference: string;
  /** Actual completed challenge days; never derived from sample reference art. */
  completedDays: number;
};
