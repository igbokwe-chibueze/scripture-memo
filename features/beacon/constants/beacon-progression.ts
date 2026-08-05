import { BeaconLeague, DayLevel } from "@/lib/generated/prisma/enums";

export const BEACON_MODE_XP = 10;
export const BEACON_WAYPOINT_BONUS_XP = 100;
export const BEACON_COHORT_SIZE = 30;
export const BEACON_PROMOTION_COUNT = 7;
export const BEACON_DEMOTION_COUNT = 5;

export const BEACON_DAY_BONUS_XP = {
  [DayLevel.GLIMMER]: 25,
  [DayLevel.GLOW]: 40,
  [DayLevel.RADIANCE]: 60,
} as const;

export const BEACON_LEAGUES = [
  BeaconLeague.TRAVELER,
  BeaconLeague.DISCIPLE,
  BeaconLeague.MESSENGER,
  BeaconLeague.WATCHMAN,
  BeaconLeague.TEACHER,
  BeaconLeague.SHEPHERD,
  BeaconLeague.ELDER,
  BeaconLeague.SCRIBE,
  BeaconLeague.SAINT,
] as const;

/** Returns the cumulative XP required to enter a one-based Beacon level. */
export function beaconLevelStartXp(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return (250 * safeLevel * (safeLevel - 1)) / 2;
}

/** Converts lifetime XP into its permanent Beacon level. */
export function beaconLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  return Math.floor((1 + Math.sqrt(1 + (8 * safeXp) / 250)) / 2);
}

/** Resolves promotion while keeping Traveler and Saint as hard boundaries. */
export function promotedLeague(league: BeaconLeague): BeaconLeague {
  const index = BEACON_LEAGUES.indexOf(league);
  return BEACON_LEAGUES[Math.min(BEACON_LEAGUES.length - 1, index + 1)] ?? league;
}

/** Resolves demotion while ensuring Traveler can never move lower. */
export function demotedLeague(league: BeaconLeague): BeaconLeague {
  const index = BEACON_LEAGUES.indexOf(league);
  return BEACON_LEAGUES[Math.max(0, index - 1)] ?? league;
}

/** Saint placements award permanent prestige, never spendable currency. */
export function saintCrownAward(rank: number): number {
  if (rank === 1) return 5;
  if (rank === 2) return 3;
  if (rank === 3) return 2;
  if (rank <= 10) return 1;
  return 0;
}
