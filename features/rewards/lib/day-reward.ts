import { DayLevel, type DayLevel as DayLevelValue } from "@/lib/generated/prisma/enums";
import { BASE_GLOW_POINTS } from "@/lib/constants";

/** Server-owned campaign reward amounts; clients never submit these values. */
/** Returns one reward from the current base without changing ledger history. */
export function getDayRewardAmount(
  dayLevel: DayLevelValue,
  baseGlowPoints = BASE_GLOW_POINTS,
): number {
  if (!Number.isInteger(baseGlowPoints) || baseGlowPoints < 1) {
    throw new RangeError("The base Glow reward must be a positive integer.");
  }

  const multipliers = {
    [DayLevel.GLIMMER]: 1,
    [DayLevel.GLOW]: 1.5,
    [DayLevel.RADIANCE]: 2,
  } as const satisfies Record<DayLevelValue, number>;

  return Math.round(baseGlowPoints * multipliers[dayLevel]);
}

/** Creates the stable database identity that prevents duplicate day rewards. */
export function getDayRewardIdempotencyKey(
  userId: string,
  waypointId: string,
  dayLevel: DayLevelValue,
): string {
  return `day-complete:${userId}:${waypointId}:${dayLevel}`;
}
