import type {
  CompletionStatus,
  DayLevel,
  GameMode,
  GameModeAttemptStatus,
  JourneyStage,
  TranslationCode,
} from "@/lib/generated/prisma/enums";
import type { CompleteDayResult } from "@/features/progression/types/progression.types";
import type { DayRewardResult } from "@/features/rewards/types/reward.types";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import type { BeaconProgressionResult } from "@/features/beacon/types/beacon.types";

export type StreakCompletionResult = {
  status: "unchanged" | "started" | "increased" | "reset";
  currentStreak: number;
  bestStreak: number;
  isNewBest: boolean;
  previousBestStreak: number;
  levelName: string;
  reachedNewLevel: boolean;
  forecast: Array<{
    dateKey: string;
    label: string;
    streakDays: number;
    state: "today" | "upcoming" | "milestone";
  }>;
  nextLevel: {
    name: string;
    minimumDays: number;
    daysRemaining: number;
    projectedDateKey: string;
    projectedDateLabel: string;
  } | null;
};

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
  isVaultReplay: boolean;
  translation: TranslationCode;
  waypoint: { number: number; journeyStage: JourneyStage } | null;
  verse: {
    id: string;
    reference: string;
    translationText: string;
  };
  completedModes: GameMode[];
  currentMode: GameMode | null;
  audioEnabled: boolean;
  hintBalance: number;
  beaconProgress: {
    lifetimeXp: number;
    level: number;
    currentLevelStartXp: number;
    nextLevelXp: number;
  };
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
      streak: StreakCompletionResult | null;
      badgeUnlocks: BadgeUnlockResult[];
      beaconProgression: BeaconProgressionResult | null;
    }
  | {
      status: "vault-complete";
      gameMode: GameMode;
      nextMode: null;
      dayCompletion: null;
      streak: null;
      badgeUnlocks: BadgeUnlockResult[];
    }
  | {
      status: "day-complete";
      gameMode: GameMode;
      nextMode: null;
      dayCompletion: CompleteDayResult & { reward: DayRewardResult };
      streak: StreakCompletionResult;
      badgeUnlocks: BadgeUnlockResult[];
      beaconProgression: BeaconProgressionResult;
    };
