import type {
  CompletionStatus,
  DayLevel,
  JourneyStage,
} from "@/lib/generated/prisma/enums";

/** Minimal private session data shown by the temporary Phase 12 destination. */
export type SessionReadyData = {
  id: string;
  waypointId: string | null;
  dayLevel: DayLevel | null;
  status: CompletionStatus;
  waypoint: { number: number; journeyStage: JourneyStage } | null;
  verse: { reference: string };
};
