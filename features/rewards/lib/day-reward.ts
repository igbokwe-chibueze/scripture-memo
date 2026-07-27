import { DayLevel, type DayLevel as DayLevelValue } from "@/lib/generated/prisma/enums";
import { BASE_GLOW_POINTS } from "@/lib/constants";

/** Server-owned campaign reward amounts; clients never submit these values. */
const DAY_REWARD_AMOUNTS = {
  [DayLevel.GLIMMER]: BASE_GLOW_POINTS,
  [DayLevel.GLOW]: Math.round(BASE_GLOW_POINTS * 1.5),
  [DayLevel.RADIANCE]: BASE_GLOW_POINTS * 2,
} as const satisfies Record<DayLevelValue, number>;

/** Returns the configured reward for one server-verified challenge day. */
export function getDayRewardAmount(dayLevel: DayLevelValue): number {
  return DAY_REWARD_AMOUNTS[dayLevel];
}

/** Creates the stable database identity that prevents duplicate day rewards. */
export function getDayRewardIdempotencyKey(
  userId: string,
  waypointId: string,
  dayLevel: DayLevelValue,
): string {
  return `day-complete:${userId}:${waypointId}:${dayLevel}`;
}
