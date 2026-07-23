import type {
  CompletionStatus,
  DayLevel,
  GameMode,
  GameModeAttemptStatus,
  JourneyStage,
  TranslationCode,
} from "@/lib/generated/prisma/enums";
import type { CompleteDayResult } from "@/features/progression/types/progression.types";

export type GameplayConflictCode =
  | "SESSION_UNAVAILABLE"
  | "MODE_OUT_OF_ORDER"
  | "ATTEMPT_NOT_ACTIVE"
  | "ATTEMPT_EXPIRED"
  | "ANSWER_INCORRECT"
  | "ALL_MODES_COMPLETED";

/** Private server data required to render the shared gameplay shell. */
export type GameplaySessionData = {
  id: string;
  waypointId: string | null;
  dayLevel: DayLevel | null;
  status: CompletionStatus;
  translation: TranslationCode;
  waypoint: { number: number; journeyStage: JourneyStage } | null;
  verse: {
    reference: string;
    translationText: string;
  };
  completedModes: GameMode[];
  currentMode: GameMode | null;
  audioEnabled: boolean;
};

/** One server-created attempt and its optional authoritative deadline. */
export type GameModeAttemptData = {
  id: string;
  gameMode: GameMode;
  attemptNumber: number;
  status: GameModeAttemptStatus;
  startedAt: Date;
  expiresAt: Date | null;
};

export type CompleteModeResult =
  | {
      status: "incorrect" | "expired";
      gameMode: GameMode;
      dayCompletion: null;
    }
  | {
      status: "mode-complete";
      gameMode: GameMode;
      nextMode: GameMode;
      dayCompletion: null;
    }
  | {
      status: "day-complete";
      gameMode: GameMode;
      nextMode: null;
      dayCompletion: CompleteDayResult;
    };
