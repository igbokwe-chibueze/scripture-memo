import {
  BadgeCategory,
  BadgeRarity,
} from "@/lib/generated/prisma/enums";
import type { BadgeDefinition } from "@/features/badges/types/badge.types";
import { BADGE_REWARD_BY_RARITY } from "@/features/badges/constants/badge-criteria";

/** Creates one immutable catalogue definition with its approved rarity reward. */
function badge(
  definition: Omit<BadgeDefinition, "rewardAmount">,
): BadgeDefinition {
  return {
    ...definition,
    rewardAmount: BADGE_REWARD_BY_RARITY[definition.rarity],
  };
}

/** Approved bootstrap catalogue; future-feature criteria remain safely dormant. */
export const BADGE_CATALOG: readonly BadgeDefinition[] = [
  badge({ name: "First Steps", slug: "first-steps", description: "Complete your first Learn stage.", icon: "🌱", category: BadgeCategory.LEARNING, rarity: BadgeRarity.COMMON, criteriaKey: "LEARN_STAGE_COMPLETED", targetValue: 1 }),
  badge({ name: "Verse Scholar", slug: "verse-scholar", description: "Master 10 verses.", icon: "📚", category: BadgeCategory.LEARNING, rarity: BadgeRarity.UNCOMMON, criteriaKey: "MASTERED_VERSES", targetValue: 10 }),
  badge({ name: "Scripture Keeper", slug: "scripture-keeper", description: "Master 25 verses.", icon: "📜", category: BadgeCategory.LEARNING, rarity: BadgeRarity.RARE, criteriaKey: "MASTERED_VERSES", targetValue: 25 }),
  badge({ name: "Scripture Master", slug: "scripture-master", description: "Master 50 verses.", icon: "👑", category: BadgeCategory.LEARNING, rarity: BadgeRarity.EPIC, criteriaKey: "MASTERED_VERSES", targetValue: 50 }),
  badge({ name: "Living Word", slug: "living-word", description: "Master 100 verses.", icon: "🕊️", category: BadgeCategory.LEARNING, rarity: BadgeRarity.LEGENDARY, criteriaKey: "MASTERED_VERSES", targetValue: 100 }),
  ...[
    ["Spark", "spark", 1, BadgeRarity.COMMON, "🔥"],
    ["Kindling", "kindling", 3, BadgeRarity.COMMON, "🪵"],
    ["Steady Flame", "steady-flame", 7, BadgeRarity.UNCOMMON, "🔥"],
    ["Beacon", "beacon", 14, BadgeRarity.UNCOMMON, "🕯️"],
    ["Blaze", "blaze", 30, BadgeRarity.RARE, "☀️"],
    ["Inferno", "inferno", 60, BadgeRarity.EPIC, "🌋"],
    ["Supernova", "supernova", 100, BadgeRarity.EPIC, "💫"],
    ["Eternal Light", "eternal-light", 365, BadgeRarity.LEGENDARY, "🌟"],
  ].map(([name, slug, targetValue, rarity, icon]) =>
    badge({
      name: String(name),
      slug: String(slug),
      description: `Maintain a ${targetValue}-day streak.`,
      icon: String(icon),
      category: BadgeCategory.STREAK,
      rarity: rarity as BadgeRarity,
      criteriaKey: "STREAK_DAYS",
      targetValue: Number(targetValue),
    }),
  ),
  badge({ name: "Perfectionist", slug: "perfectionist", description: "Complete 10 sessions perfectly on the first attempt.", icon: "💯", category: BadgeCategory.MASTERY, rarity: BadgeRarity.RARE, criteriaKey: "PERFECT_SESSIONS", targetValue: 10 }),
  badge({ name: "Verse Champion", slug: "verse-champion", description: "Complete every Journey Stage for one verse.", icon: "🧠", category: BadgeCategory.MASTERY, rarity: BadgeRarity.RARE, criteriaKey: "VERSE_ALL_STAGES", targetValue: 1 }),
  badge({ name: "Lightning Memory", slug: "lightning-memory", description: "Complete a Master stage within its time limit.", icon: "⚡", category: BadgeCategory.MASTERY, rarity: BadgeRarity.EPIC, criteriaKey: "MASTER_STAGE_FAST", targetValue: 1, isActive: false }),
  badge({ name: "Master of Recall", slug: "master-of-recall", description: "Complete 50 Recall stage waypoints.", icon: "🎖️", category: BadgeCategory.MASTERY, rarity: BadgeRarity.EPIC, criteriaKey: "RECALL_WAYPOINTS", targetValue: 50 }),
  badge({ name: "No Looking Back", slug: "no-looking-back", description: "Complete a Learn stage without assistance.", icon: "🙈", category: BadgeCategory.INDEPENDENCE, rarity: BadgeRarity.UNCOMMON, criteriaKey: "LEARN_HINT_FREE", targetValue: 1 }),
  badge({ name: "Independent Recall", slug: "independent-recall", description: "Complete 20 Strengthen stages without assistance.", icon: "🚫", category: BadgeCategory.INDEPENDENCE, rarity: BadgeRarity.RARE, criteriaKey: "STRENGTHEN_HINT_FREE", targetValue: 20 }),
  badge({ name: "Memory Machine", slug: "memory-machine", description: "Complete 50 Master stages without assistance.", icon: "🧠", category: BadgeCategory.INDEPENDENCE, rarity: BadgeRarity.EPIC, criteriaKey: "MASTER_HINT_FREE", targetValue: 50 }),
  badge({ name: "Quick Thinker", slug: "quick-thinker", description: "Complete a Recall stage within the bonus threshold.", icon: "⚡", category: BadgeCategory.SPEED, rarity: BadgeRarity.UNCOMMON, criteriaKey: "RECALL_FAST", targetValue: 1, isActive: false }),
  badge({ name: "Speed Demon", slug: "speed-demon", description: "Complete 25 timed stages.", icon: "🚀", category: BadgeCategory.SPEED, rarity: BadgeRarity.RARE, criteriaKey: "TIMED_STAGES", targetValue: 25 }),
  badge({ name: "Against the Clock", slug: "against-the-clock", description: "Complete 100 timed stages.", icon: "⏱️", category: BadgeCategory.SPEED, rarity: BadgeRarity.EPIC, criteriaKey: "TIMED_STAGES", targetValue: 100 }),
  badge({ name: "Vault Explorer", slug: "vault-explorer", description: "Replay 25 mastered verses through the Vault.", icon: "📖", category: BadgeCategory.EXPLORATION, rarity: BadgeRarity.RARE, criteriaKey: "VAULT_REPLAYS", targetValue: 25 }),
  badge({ name: "Community Member", slug: "community-member", description: "Join your first Fellowship.", icon: "👥", category: BadgeCategory.EXPLORATION, rarity: BadgeRarity.COMMON, criteriaKey: "FELLOWSHIP_JOIN", targetValue: 1 }),
  badge({ name: "Faith Builder", slug: "faith-builder", description: "Create a Fellowship.", icon: "🤝", category: BadgeCategory.EXPLORATION, rarity: BadgeRarity.UNCOMMON, criteriaKey: "FELLOWSHIP_CREATE", targetValue: 1 }),
  badge({ name: "Beacon Challenger", slug: "beacon-challenger", description: "Reach the Global Leaderboard top 100.", icon: "🌟", category: BadgeCategory.EXPLORATION, rarity: BadgeRarity.EPIC, criteriaKey: "LEADERBOARD_TOP_100", targetValue: 1, isHidden: true, isActive: false }),
] as const;
