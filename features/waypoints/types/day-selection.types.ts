import type {
  CompletionStatus,
  DayLevel,
  JourneyStage,
  TranslationCode,
} from "@/lib/generated/prisma/enums";

export type DaySelectionStatus = "LOCKED" | "COOLDOWN" | "READY" | "COMPLETE";

/** Minimal persisted day state required to derive a learner-facing card. */
export type DayProgressSnapshot = {
  dayLevel: DayLevel;
  status: CompletionStatus;
  unlocksAt: Date | null;
};

/** Authenticated, serializable data displayed by the Day Selection screen. */
export type DaySelectionData = {
  waypointId: string;
  waypointNumber: number;
  reference: string;
  journeyStage: JourneyStage;
  translation: TranslationCode;
  translationText: string;
  dayProgress: DayProgressSnapshot[];
};

/** Fully derived card model; the server remains authoritative for readiness. */
export type DayCardData = {
  dayLevel: DayLevel;
  name: string;
  difficulty: string;
  status: DaySelectionStatus;
  reward: number;
  unlocksAt: Date | null;
  blockedReason: string | null;
};
