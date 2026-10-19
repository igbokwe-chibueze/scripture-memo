/** Calendar arithmetic uses UTC only as a date-label calculator, never the viewer's browser zone. */
import {
  getZonedCalendarDateKey,
  isValidTimeZone,
} from "@/features/progression/lib/streak-utils";
import type { ActivityDay, StatsPeriod } from "../schemas/player-stats.schema";

const DAY_MS = 86_400_000;

/** Convert a validated calendar key to a neutral instant for labels/arithmetic. */
export function calendarDate(key: string): Date {
  return new Date(`${key}T12:00:00.000Z`);
}

/** Return a calendar key after whole-day arithmetic; unaffected by 23/25-hour days. */
export function shiftCalendarDay(key: string, offset: number): string {
  return new Date(calendarDate(key).getTime() + offset * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Clamp the anniversary for leap-day years before taking an inclusive 12-month window. */
export function getActivityRange(
  period: StatsPeriod,
  now: Date,
  configuredZone: string,
): {
  start: string;
  end: string;
  today: string;
} {
  const timeZone = isValidTimeZone(configuredZone) ? configuredZone : "UTC";
  const today = getZonedCalendarDateKey(now, timeZone);
  const [year, month, day] = today.split("-").map(Number);
  if (period !== "recent") {
    return {
      start: `${period}-01-01`,
      end: period === year ? today : `${period}-12-31`,
      today,
    };
  }
  const previousMonthLength = new Date(
    Date.UTC(year - 1, month, 0),
  ).getUTCDate();
  const anniversary = new Date(
    Date.UTC(year - 1, month - 1, Math.min(day, previousMonthLength)),
  )
    .toISOString()
    .slice(0, 10);
  return { start: shiftCalendarDay(anniversary, 1), end: today, today };
}

/** Fill every date with zero activity, including leap days and ordinary inactive days. */
export function fillActivityDays(
  start: string,
  end: string,
  rows: readonly ActivityDay[],
): ActivityDay[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const days: ActivityDay[] = [];
  for (let date = start; date <= end; date = shiftCalendarDay(date, 1)) {
    days.push(byDate.get(date) ?? { date, learning: 0, practice: 0 });
  }
  return days;
}

/** Fixed thresholds make the same workload comparable across years and players. */
export function activityLevel(total: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0) return 0;
  if (total < 5) return 1;
  if (total < 10) return 2;
  if (total < 20) return 3;
  return 4;
}

/** Monday-first week padding is presentation only; empty cells are not recorded days. */
export function activityWeeks(
  days: readonly ActivityDay[],
): (ActivityDay | null)[][] {
  if (!days.length) return [];
  const leading = (calendarDate(days[0].date).getUTCDay() + 6) % 7;
  const cells: (ActivityDay | null)[] = [
    ...Array<null>(leading).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

/** List the months touched by the selected period, including partial rolling-window months. */
export function activityMonths(start: string, end: string): string[] {
  const months: string[] = [];
  const cursor = calendarDate(`${start.slice(0, 7)}-01`);
  while (cursor.toISOString().slice(0, 7) <= end.slice(0, 7)) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}
