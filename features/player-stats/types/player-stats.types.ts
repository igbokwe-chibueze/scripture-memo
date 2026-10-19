import type {
  StatsAggregate,
  StatsOwner,
  StatsPeriod,
} from "../schemas/player-stats.schema";

/** Lifetime totals and selected-period activity deliberately remain distinct. */
export type PlayerStatsData = {
  owner: Omit<StatsOwner, "joinedAt" | "startingHintAllowance"> & {
    joinedAt: string;
  };
  totals: StatsAggregate;
  hintsRemaining: number;
  period: StatsPeriod;
  range: { start: string; end: string; today: string };
  years: number[];
};
