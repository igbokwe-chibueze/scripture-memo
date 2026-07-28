const DAY_MS = 24 * 60 * 60 * 1_000;

export type StreakState = {
  currentStreak: number;
  bestStreak: number;
  lastActiveAt: Date | null;
};

export type StreakUpdate = StreakState & {
  changed: boolean;
  status: "unchanged" | "started" | "increased" | "reset";
  isNewBest: boolean;
  previousBestStreak: number;
  level: StreakLevel;
  reachedNewLevel: boolean;
};

export type StreakLevel = {
  name: "Spark" | "Kindling" | "Steady Flame" | "Beacon" | "Blaze" | "Inferno" | "Supernova" | "Eternal Light";
  minimumDays: number;
};

export type StreakForecastDay = {
  dateKey: string;
  label: string;
  streakDays: number;
  state: "today" | "upcoming" | "milestone";
};

export type NextStreakLevel = StreakLevel & {
  daysRemaining: number;
  projectedDateKey: string;
  projectedDateLabel: string;
};

const STREAK_LEVELS: readonly StreakLevel[] = [
  { name: "Spark", minimumDays: 1 },
  { name: "Kindling", minimumDays: 3 },
  { name: "Steady Flame", minimumDays: 7 },
  { name: "Beacon", minimumDays: 14 },
  { name: "Blaze", minimumDays: 30 },
  { name: "Inferno", minimumDays: 60 },
  { name: "Supernova", minimumDays: 100 },
  { name: "Eternal Light", minimumDays: 365 },
] as const;

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

/** Returns the stable YYYY-MM-DD key for an instant in a validated timezone. */
export function getZonedCalendarDateKey(
  instant: Date,
  configuredTimeZone: string,
): string {
  const timeZone = isValidTimeZone(configuredTimeZone)
    ? configuredTimeZone
    : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Resolves the highest named level reached by a positive streak. */
export function getStreakLevel(days: number): StreakLevel {
  return [...STREAK_LEVELS]
    .reverse()
    .find((level) => days >= level.minimumDays) ?? STREAK_LEVELS[0]!;
}

/** Returns the next named level, or null after Eternal Light is reached. */
export function getNextStreakLevel(days: number): StreakLevel | null {
  return STREAK_LEVELS.find((level) => level.minimumDays > days) ?? null;
}

/**
 * Projects today plus six learner-local calendar days toward the next level.
 *
 * This is motivational forecasting, not granted progress. Date keys advance as
 * UTC calendar values after timezone extraction so DST cannot shift a marker.
 */
export function getStreakForecast(
  activityDate: Date,
  timeZone: string,
  currentStreak: number,
): { days: StreakForecastDay[]; nextLevel: NextStreakLevel | null } {
  const todayKey = getZonedCalendarDateKey(activityDate, timeZone);
  const [year, month, day] = todayKey.split("-").map(Number);
  const todayCalendar = Date.UTC(year!, month! - 1, day!);
  const level = getNextStreakLevel(currentStreak);
  const daysRemaining = level ? level.minimumDays - currentStreak : null;

  // WHY: The seventh tile becomes the milestone date when the next threshold
  // lies beyond the six-day window. This keeps both today and the actual target
  // visible without rendering an impractically long calendar.
  const offsets =
    daysRemaining !== null && daysRemaining > 6
      ? [0, 1, 2, 3, 4, 5, daysRemaining]
      : [0, 1, 2, 3, 4, 5, 6];
  const days: StreakForecastDay[] = offsets.map((offset) => {
    const date = new Date(todayCalendar + offset * DAY_MS);
    const dateKey = date.toISOString().slice(0, 10);
    return {
      dateKey,
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }).format(date),
      streakDays: currentStreak + offset,
      state:
        offset === 0
          ? "today"
          : daysRemaining === offset
            ? "milestone"
            : "upcoming",
    };
  });

  if (!level || daysRemaining === null) return { days, nextLevel: null };
  const projectedDate = new Date(todayCalendar + daysRemaining * DAY_MS);
  return {
    days,
    nextLevel: {
      ...level,
      daysRemaining,
      projectedDateKey: projectedDate.toISOString().slice(0, 10),
      projectedDateLabel: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(projectedDate),
    },
  };
}

/** Calculates the idempotent next streak state for one verified activity. */
export function calculateStreakUpdate(
  state: StreakState,
  activityDate: Date,
  timeZone: string,
): StreakUpdate {
  if (!state.lastActiveAt) {
    const level = getStreakLevel(1);
    return {
      currentStreak: 1,
      bestStreak: Math.max(1, state.bestStreak),
      lastActiveAt: activityDate,
      changed: true,
      status: "started",
      isNewBest: state.bestStreak < 1,
      previousBestStreak: state.bestStreak,
      level,
      reachedNewLevel: true,
    };
  }

  const previousDay = getZonedCalendarDay(state.lastActiveAt, timeZone);
  const activityDay = getZonedCalendarDay(activityDate, timeZone);
  const elapsedDays = activityDay - previousDay;
  if (elapsedDays <= 0) {
    return {
      ...state,
      changed: false,
      status: "unchanged",
      isNewBest: false,
      previousBestStreak: state.bestStreak,
      level: getStreakLevel(state.currentStreak),
      reachedNewLevel: false,
    };
  }

  const currentStreak =
    elapsedDays === 1 ? Math.max(1, state.currentStreak) + 1 : 1;
  const level = getStreakLevel(currentStreak);
  return {
    currentStreak,
    bestStreak: Math.max(state.bestStreak, currentStreak),
    lastActiveAt: activityDate,
    changed: true,
    status: elapsedDays === 1 ? "increased" : "reset",
    isNewBest: currentStreak > state.bestStreak,
    previousBestStreak: state.bestStreak,
    level,
    reachedNewLevel:
      elapsedDays === 1 &&
      currentStreak === level.minimumDays &&
      getStreakLevel(state.currentStreak).name !== level.name,
  };
}

/** Produces the compact learner-facing streak label used across surfaces. */
export function getStreakDisplay(currentStreak: number): string {
  return `🔥 ${currentStreak}-day streak`;
}
