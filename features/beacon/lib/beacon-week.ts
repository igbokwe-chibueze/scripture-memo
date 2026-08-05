export type BeaconWeekWindow = {
  startsAt: Date;
  endsAt: Date;
};

/**
 * Returns the single global Monday-to-Sunday competition window.
 *
 * UTC gives every learner the exact same amount of competition time. The UI
 * may localize these instants, but user timezones and client clocks never decide
 * which week receives a server-confirmed completion.
 */
export function getBeaconWeekWindow(at: Date): BeaconWeekWindow {
  const day = at.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const startsAt = new Date(
    Date.UTC(
      at.getUTCFullYear(),
      at.getUTCMonth(),
      at.getUTCDate() - daysSinceMonday,
    ),
  );
  const endsAt = new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  return { startsAt, endsAt };
}
