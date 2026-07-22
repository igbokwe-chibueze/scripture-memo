import {
  CompletionStatus,
  DayLevel,
  type DayLevel as DayLevelValue,
} from "@/lib/generated/prisma/enums";
import { BASE_GLOW_POINTS } from "@/lib/constants";
import type {
  DayCardData,
  DayProgressSnapshot,
} from "@/features/waypoints/types/day-selection.types";

const DAY_PRESENTATION = {
  [DayLevel.GLIMMER]: {
    name: "Glimmer",
    difficulty: "Gentle beginning",
    reward: BASE_GLOW_POINTS,
  },
  [DayLevel.GLOW]: {
    name: "Glow",
    difficulty: "Growing recall",
    reward: BASE_GLOW_POINTS * 1.5,
  },
  [DayLevel.RADIANCE]: {
    name: "Radiance",
    difficulty: "Full remembrance",
    reward: BASE_GLOW_POINTS * 2,
  },
} as const satisfies Record<
  DayLevelValue,
  { name: string; difficulty: string; reward: number }
>;

/** Ordered challenge contract used by both cards and server action input. */
export const DAY_SELECTION_ORDER = [
  DayLevel.GLIMMER,
  DayLevel.GLOW,
  DayLevel.RADIANCE,
] as const satisfies readonly DayLevelValue[];

/**
 * Derives display state from persisted rows and one server-owned timestamp.
 *
 * The browser may refresh this display after a countdown, but the Start action
 * repeats every ordering and cooldown check using database state.
 */
export function buildDayCards(
  snapshots: DayProgressSnapshot[],
  now: Date,
): DayCardData[] {
  const byLevel = new Map(snapshots.map((snapshot) => [snapshot.dayLevel, snapshot]));

  return DAY_SELECTION_ORDER.map((dayLevel, index) => {
    const presentation = DAY_PRESENTATION[dayLevel];
    const progress = byLevel.get(dayLevel);
    const previousLevel = DAY_SELECTION_ORDER[index - 1];
    const previousProgress = previousLevel ? byLevel.get(previousLevel) : null;
    const previousComplete = index === 0 || previousProgress?.status === CompletionStatus.COMPLETED;

    if (progress?.status === CompletionStatus.COMPLETED) {
      return {
        dayLevel,
        ...presentation,
        status: "COMPLETE" as const,
        unlocksAt: null,
        blockedReason: null,
      };
    }

    if (!previousComplete) {
      return {
        dayLevel,
        ...presentation,
        status: "LOCKED" as const,
        unlocksAt: null,
        blockedReason: `Complete ${DAY_PRESENTATION[previousLevel!].name} first.`,
      };
    }

    if (progress?.unlocksAt && progress.unlocksAt.getTime() > now.getTime()) {
      return {
        dayLevel,
        ...presentation,
        status: "COOLDOWN" as const,
        unlocksAt: progress.unlocksAt,
        blockedReason: `${presentation.name} is still gathering light.`,
      };
    }

    return {
      dayLevel,
      ...presentation,
      status: "READY" as const,
      unlocksAt: null,
      blockedReason: null,
    };
  });
}
