import {
  CompletionStatus,
  DayLevel,
  WaypointStatus,
  type DayLevel as DayLevelValue,
  type WaypointStatus as WaypointStatusValue,
} from "@/lib/generated/prisma/enums";
import type { UserDayProgressModel } from "@/lib/generated/prisma/models/UserDayProgress";
import type { UserWaypointProgressModel } from "@/lib/generated/prisma/models/UserWaypointProgress";
import { DAY_COOLDOWN_HOURS } from "@/lib/constants";
import { addHours } from "@/lib/dates";

/** Ordered challenge days used only by server-owned transition logic. */
export const DAY_LEVEL_ORDER = [
  DayLevel.GLIMMER,
  DayLevel.GLOW,
  DayLevel.RADIANCE,
] as const satisfies readonly DayLevelValue[];

/** Returns the day immediately following the supplied day, if one exists. */
export function getNextDayLevel(dayLevel: DayLevelValue): DayLevelValue | null {
  const index = DAY_LEVEL_ORDER.indexOf(dayLevel);
  return DAY_LEVEL_ORDER[index + 1] ?? null;
}

/** Returns the day immediately preceding the supplied day, if one exists. */
export function getPreviousDayLevel(dayLevel: DayLevelValue): DayLevelValue | null {
  const index = DAY_LEVEL_ORDER.indexOf(dayLevel);
  return index > 0 ? DAY_LEVEL_ORDER[index - 1] : null;
}

/**
 * Returns whether a day is playable at the supplied server time.
 *
 * WHY: This decision is always repeated server-side because client countdown
 * timers are cosmetic and can be bypassed with a crafted network request.
 */
export function isDayPlayable(
  dayProgress: UserDayProgressModel,
  now: Date = new Date(),
): boolean {
  if (dayProgress.status === CompletionStatus.COMPLETED) return false;
  return dayProgress.unlocksAt === null || dayProgress.unlocksAt.getTime() <= now.getTime();
}

/** Calculates the UTC-safe instant at which Day 2 becomes playable. */
export function calculateDay2UnlockTime(day1CompletedAt: Date): Date {
  return addHours(day1CompletedAt, DAY_COOLDOWN_HOURS);
}

/** Calculates the UTC-safe instant at which Day 3 becomes playable. */
export function calculateDay3UnlockTime(day2CompletedAt: Date): Date {
  return addHours(day2CompletedAt, DAY_COOLDOWN_HOURS);
}

/** Treats absent lazy progress as locked without inventing a database record. */
export function getWaypointStatusForUser(
  progress: UserWaypointProgressModel | null,
): WaypointStatusValue {
  return progress?.status ?? WaypointStatus.LOCKED;
}

