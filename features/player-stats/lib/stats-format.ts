/** Truthful, localized presentation of recorded attempt outcomes and elapsed time. */
import type { StatsAggregate } from "../schemas/player-stats.schema";

/** Incomplete attempts are not counted as failures in a completion rate. */
export function getModeTotals(modes: StatsAggregate["modes"]): {
  completed: number;
  failed: number;
  expired: number;
  unfinished: number;
  firstTry: number;
  recordedMs: number;
  timedAttempts: number;
  completionRate: number | null;
} {
  const totals = modes.reduce(
    (sum, mode) => ({
      completed: sum.completed + mode.completed,
      failed: sum.failed + mode.failed,
      expired: sum.expired + mode.expired,
      unfinished: sum.unfinished + mode.inProgress,
      firstTry: sum.firstTry + mode.firstTry,
      recordedMs: sum.recordedMs + mode.recordedMs,
      timedAttempts: sum.timedAttempts + mode.timedAttempts,
    }),
    {
      completed: 0,
      failed: 0,
      expired: 0,
      unfinished: 0,
      firstTry: 0,
      recordedMs: 0,
      timedAttempts: 0,
    },
  );
  const finished = totals.completed + totals.failed + totals.expired;
  return {
    ...totals,
    completionRate: finished ? totals.completed / finished : null,
  };
}

/** Missing durations remain unavailable; they are never fabricated as zero. */
export function formatStatsDuration(
  milliseconds: number | null,
  locale: string,
): string {
  if (milliseconds === null) return "—";
  const seconds = Math.round(milliseconds / 1000);
  const unit = (value: number, name: "hour" | "minute" | "second"): string =>
    new Intl.NumberFormat(locale, {
      style: "unit",
      unit: name,
      unitDisplay: "short",
    }).format(value);
  if (seconds >= 3600)
    return `${unit(Math.floor(seconds / 3600), "hour")} ${unit(Math.floor((seconds % 3600) / 60), "minute")}`;
  if (seconds >= 60)
    return `${unit(Math.floor(seconds / 60), "minute")} ${unit(seconds % 60, "second")}`;
  return unit(seconds, "second");
}
