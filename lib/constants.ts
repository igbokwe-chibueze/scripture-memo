import {
  DayLevel,
  GameMode,
  type DayLevel as DayLevelValue,
  type GameMode as GameModeValue,
} from "@/lib/generated/prisma/enums";

/** Mandatory gameplay order; server actions must reject out-of-order attempts. */
export const GAME_MODE_ORDER = [
  GameMode.DRAG_DROP,
  GameMode.PUZZLE,
  GameMode.SWAP,
  GameMode.CUE,
  GameMode.FILL,
] as const satisfies readonly GameModeValue[];

/** Free hints granted to a new player before shop purchases. */
export const DEFAULT_HINT_ALLOWANCE = 5;

/**
 * Default Day 1 reward used when no Super Admin override exists.
 * New accounts still begin with a zero balance; points enter the balance only
 * through an earned reward and its matching immutable ledger entry.
 */
export const BASE_GLOW_POINTS = 100;

/** Required elapsed hours between consecutive challenge days. */
export const DAY_COOLDOWN_HOURS = 24;

export type DifficultyRange = {
  minHiddenPercent: number;
  maxHiddenPercent: number;
};

/**
 * Server-authoritative hidden-word percentage ranges for each challenge day.
 * Gameplay generators select within these inclusive bounds; clients may display
 * the difficulty but must never choose or override it.
 */
export const DIFFICULTY_RANGES = {
  [DayLevel.GLIMMER]: { minHiddenPercent: 20, maxHiddenPercent: 35 },
  [DayLevel.GLOW]: { minHiddenPercent: 40, maxHiddenPercent: 60 },
  [DayLevel.RADIANCE]: { minHiddenPercent: 70, maxHiddenPercent: 100 },
} as const satisfies Record<DayLevelValue, DifficultyRange>;
