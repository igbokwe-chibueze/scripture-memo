import type { DayLevel } from "@/lib/generated/prisma/enums";

/** Persisted reward outcome safe to return with a verified day completion. */
export type DayRewardResult = {
  dayLevel: DayLevel;
  amount: number;
  balance: number;
  waypointRewardTotal: number;
};

/** Cursor pagination input for immutable reward history reads. */
export type RewardHistoryInput = {
  cursor?: string;
  take?: number;
};
