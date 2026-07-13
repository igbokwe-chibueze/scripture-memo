import type { DayLevel } from "@/lib/generated/prisma/enums";

/** Stable conflict reasons produced by the server-authoritative progression engine. */
export type ProgressionConflictCode =
  | "CURRICULUM_UNAVAILABLE"
  | "WAYPOINT_UNAVAILABLE"
  | "WAYPOINT_LOCKED"
  | "DAY_NOT_INITIALIZED"
  | "DAY_ALREADY_COMPLETED"
  | "PREVIOUS_DAY_INCOMPLETE"
  | "DAY_COOLDOWN_ACTIVE";

/** Result returned after the first playable waypoint is initialized idempotently. */
export type InitializeProgressionResult =
  | { status: "ready"; waypointId: string; waypointNumber: number }
  | { status: "curriculum-unavailable" };

/** Atomic outcome of a trusted day-completion transition. */
export type CompleteDayResult = {
  completedDay: DayLevel;
  nextDayUnlocksAt: Date | null;
  unlockedWaypoint: { id: string; number: number } | null;
  caughtUp: boolean;
};

