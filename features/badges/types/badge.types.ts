import type {
  BadgeCategory,
  BadgeRarity,
  CompletionStatus,
} from "@/lib/generated/prisma/enums";

export type BadgeCriteriaKey =
  | "LEARN_STAGE_COMPLETED"
  | "MASTERED_VERSES"
  | "STREAK_DAYS"
  | "PERFECT_SESSIONS"
  | "VERSE_ALL_STAGES"
  | "MASTER_STAGE_FAST"
  | "RECALL_WAYPOINTS"
  | "LEARN_HINT_FREE"
  | "STRENGTHEN_HINT_FREE"
  | "MASTER_HINT_FREE"
  | "RECALL_FAST"
  | "TIMED_STAGES"
  | "VAULT_REPLAYS"
  | "FELLOWSHIP_JOIN"
  | "FELLOWSHIP_CREATE"
  | "LEADERBOARD_TOP_100";

export type BadgeDefinition = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  criteriaKey: BadgeCriteriaKey;
  targetValue: number;
  rewardAmount: number;
  isHidden?: boolean;
  isActive?: boolean;
};

export type BadgeCollectionItem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  category: BadgeCategory;
  rarity: BadgeRarity;
  targetValue: number;
  rewardAmount: number;
  isHidden: boolean;
  isActive: boolean;
  progress: number;
  status: CompletionStatus;
  unlockedAt: Date | null;
};

export type AdminBadgeItem = BadgeCollectionItem & {
  criteriaKey: BadgeCriteriaKey;
  unlockCount: number;
};

export type BadgeUnlockResult = {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  rarity: BadgeRarity;
  rewardAmount: number;
  balance: number;
};

export type BadgeEvent =
  | {
      type: "MODE_COMPLETED";
      currentStreak: number;
    }
  | {
      type: "DAY_COMPLETED";
    }
  | {
      type: "VAULT_REPLAY_COMPLETED";
    };
