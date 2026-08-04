import type { BadgeCriteriaKey } from "@/features/badges/types/badge.types";

export const BADGE_CRITERIA_LABELS = {
  LEARN_STAGE_COMPLETED: "Learn stages completed",
  MASTERED_VERSES: "Verses mastered across every Journey Stage",
  STREAK_DAYS: "Current daily streak",
  PERFECT_SESSIONS: "Perfect first-attempt sessions",
  VERSE_ALL_STAGES: "Verses completed across every Journey Stage",
  MASTER_STAGE_FAST: "Master stage completed before its deadline",
  RECALL_WAYPOINTS: "Recall waypoints completed",
  LEARN_HINT_FREE: "Learn waypoints completed without assistance",
  STRENGTHEN_HINT_FREE: "Strengthen waypoints completed without assistance",
  MASTER_HINT_FREE: "Master waypoints completed without assistance",
  RECALL_FAST: "Recall stage completed within bonus threshold",
  TIMED_STAGES: "Timed Journey Stages completed",
  VAULT_REPLAYS: "Vault replays completed",
  FELLOWSHIP_JOIN: "Fellowships joined",
  FELLOWSHIP_CREATE: "Fellowships created",
  LEADERBOARD_TOP_100: "Global leaderboard top-100 appearances",
} as const satisfies Record<BadgeCriteriaKey, string>;

/**
 * Criteria in this set have trusted metrics implemented by the badge engine.
 *
 * Other documented criteria remain selectable for advance configuration, but
 * cannot be activated until their owning roadmap feature emits a server event.
 */
export const ACTIVE_BADGE_CRITERIA_VALUES = [
  "LEARN_STAGE_COMPLETED",
  "MASTERED_VERSES",
  "STREAK_DAYS",
  "PERFECT_SESSIONS",
  "VERSE_ALL_STAGES",
  "RECALL_WAYPOINTS",
  "LEARN_HINT_FREE",
  "STRENGTHEN_HINT_FREE",
  "MASTER_HINT_FREE",
  "TIMED_STAGES",
  "VAULT_REPLAYS",
  "FELLOWSHIP_JOIN",
  "FELLOWSHIP_CREATE",
] as const satisfies readonly BadgeCriteriaKey[];

const ACTIVE_BADGE_CRITERIA = new Set<BadgeCriteriaKey>(
  ACTIVE_BADGE_CRITERIA_VALUES,
);

/** Returns whether a badge criterion can currently receive trusted progress. */
export function isBadgeCriterionAvailable(
  criteriaKey: BadgeCriteriaKey,
): boolean {
  return ACTIVE_BADGE_CRITERIA.has(criteriaKey);
}

/** Centralizes the approved server-owned reward for every rarity. */
export const BADGE_REWARD_BY_RARITY = {
  COMMON: 50,
  UNCOMMON: 100,
  RARE: 200,
  EPIC: 350,
  LEGENDARY: 500,
} as const;
