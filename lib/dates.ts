const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_MINUTE = 60 * 1000;

/**
 * Adds a number of elapsed hours to a date without mutating the caller's value.
 *
 * Cooldowns use elapsed UTC milliseconds rather than local clock fields. This
 * prevents daylight-saving or server-timezone changes from shortening or
 * extending the required 24-hour wait.
 */
export function addHours(date: Date, hours: number): Date {
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp)) {
    throw new RangeError("Cannot add hours to an invalid date.");
  }

  if (!Number.isFinite(hours)) {
    throw new RangeError("Hours must be a finite number.");
  }

  return new Date(timestamp + hours * MILLISECONDS_PER_HOUR);
}

/**
 * Reports whether a timestamp is still in the future relative to server time.
 *
 * This helper is suitable for server-side cooldown checks. Client countdowns
 * remain display-only and must never authorize gameplay.
 */
export function isAfterNow(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Returns the non-negative milliseconds remaining until a target timestamp.
 *
 * Clamping expired targets to zero keeps countdown consumers from displaying
 * negative durations while their expiration callback updates the UI.
 */
export function getRemainingMs(targetDate: Date): number {
  const timestamp = targetDate.getTime();

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.max(0, timestamp - Date.now());
}

/**
 * Formats a duration as compact whole hours and minutes, such as `23h 14m`.
 *
 * Seconds are intentionally omitted because cooldowns last hours and a
 * minute-level label is calmer and more readable. Invalid, negative, and
 * expired durations safely render as `0m`.
 */
export function formatCountdown(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "0m";
  }

  const totalMinutes = Math.floor(milliseconds / MILLISECONDS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}
