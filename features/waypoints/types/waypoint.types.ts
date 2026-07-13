import type { JourneyStage } from "@/lib/generated/prisma/enums";

export type WaypointMove = {
  id: string;
  reference: string | null;
  from: number;
  to: number;
};

export type AssignWaypointResult =
  | { status: "assigned" }
  | { status: "verse-unavailable" | "waypoint-missing" }
  | { status: "duplicate-stage"; existingNumber: number }
  | { status: "stage-order"; conflictingNumber: number; conflictingStage: JourneyStage };

export type PublishWaypointResult =
  | { status: "published" }
  | { status: "unavailable" | "earlier-hidden" | "stage-prerequisite" };

export type HideWaypointResult = "hidden" | "later-published";

export type ReorderWaypointResult =
  | { status: "reordered"; moves: WaypointMove[] }
  | { status: "stale" | "published-gap" | "stage-order" | "progress-locked" };

export type WaypointSeedData = {
  number: number;
  journeyStage: JourneyStage;
  isActive: false;
};
