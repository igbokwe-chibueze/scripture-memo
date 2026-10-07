import type { JourneyStage } from "@/lib/generated/prisma/enums";

export type WaypointMove = {
  id: string;
  reference: string | null;
  from: number;
  to: number;
};

export type AssignWaypointResult =
  | { status: "assigned" }
  | { status: "verse-unavailable" | "waypoint-missing" | "published-locked" | "progress-locked" }
  | { status: "duplicate-stage"; existingNumber: number }
  | { status: "stage-order"; conflictingNumber: number; conflictingStage: JourneyStage };

export type UnassignWaypointResult =
  | { status: "unassigned" }
  | {
      status:
        | "waypoint-missing"
        | "already-unassigned"
        | "published-locked"
        | "progress-locked";
    };

export type PublishWaypointResult =
  | { status: "published" }
  | { status: "unavailable" | "earlier-hidden" | "stage-prerequisite" };

export type HideWaypointResult = "hidden" | "later-published" | "progress-locked";

export type DeleteWaypointResult =
  | { status: "deleted"; number: number }
  | { status: "waypoint-missing" }
  | { status: "not-final" }
  | { status: "published" }
  | { status: "assigned" }
  | { status: "progress-locked" };

export type ReorderWaypointResult =
  | { status: "reordered"; moves: WaypointMove[] }
  | { status: "stale" | "published-gap" | "stage-order" | "progress-locked" };

export type WaypointSeedData = {
  number: number;
  journeyStage: JourneyStage;
  isActive: false;
};
