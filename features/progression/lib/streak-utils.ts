const DAY_MS = 24 * 60 * 60 * 1_000;

export type StreakState = {
  currentStreak: number;
  bestStreak: number;
  lastActiveAt: Date | null;
};

export type StreakUpdate = StreakState & {
  changed: boolean;
};

/** Returns whether a value is a supported IANA timezone in this runtime. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts an instant into a stable calendar-day number in the learner's zone.
 *
 * WHY: We extract local year/month/day and map those parts onto UTC solely for
 * date arithmetic. Subtracting real instants would make daylight-saving days
 * appear 23 or 25 hours long and could incorrectly break a valid streak.
 */
export function getZonedCalendarDay(
  instant: Date,
  configuredTimeZone: string,
): number {
  const timeZone = isValidTimeZone(configuredTimeZone)
    ? configuredTimeZone
    : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return Math.floor(
    Date.UTC(value("year"), value("month") - 1, value("day")) / DAY_MS,
  );
}

/** Calculates the idempotent next streak state for one verified activity. */
export function calculateStreakUpdate(
  state: StreakState,
  activityDate: Date,
  timeZone: string,
): StreakUpdate {
  if (!state.lastActiveAt) {
    return {
      currentStreak: 1,
      bestStreak: Math.max(1, state.bestStreak),
      lastActiveAt: activityDate,
      changed: true,
    };
  }

  const previousDay = getZonedCalendarDay(state.lastActiveAt, timeZone);
  const activityDay = getZonedCalendarDay(activityDate, timeZone);
  const elapsedDays = activityDay - previousDay;
  if (elapsedDays <= 0) return { ...state, changed: false };

  const currentStreak =
    elapsedDays === 1 ? Math.max(1, state.currentStreak) + 1 : 1;
  return {
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    lastActiveAt: activityDate,
    changed: true,
  };
}

/** Produces the compact learner-facing streak label used across surfaces. */
export function getStreakDisplay(currentStreak: number): string {
  return `🔥 ${currentStreak}-day streak`;
}
