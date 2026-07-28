import { z } from "zod";

const badgeCriteriaValues = [
  "LEARN_STAGE_COMPLETED",
  "MASTERED_VERSES",
  "STREAK_DAYS",
  "PERFECT_SESSIONS",
  "VERSE_ALL_STAGES",
  "MASTER_STAGE_FAST",
  "RECALL_WAYPOINTS",
  "LEARN_HINT_FREE",
  "STRENGTHEN_HINT_FREE",
  "MASTER_HINT_FREE",
  "RECALL_FAST",
  "TIMED_STAGES",
  "VAULT_REPLAYS",
  "FELLOWSHIP_JOIN",
  "FELLOWSHIP_CREATE",
  "LEADERBOARD_TOP_100",
] as const;

/** Validates administrator badge definitions before identity or data access. */
export const saveBadgeSchema = z.object({
  id: z.string().cuid().optional(),
  name: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters.")
    .max(80, "Use no more than 80 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Explain the achievement in at least 10 characters.")
    .max(240, "Use no more than 240 characters.")
    .refine((value) => !/\bhint\b/i.test(value), {
      message: "Use assistance wording instead of the prohibited mode term.",
    }),
  icon: z
    .string()
    .trim()
    .max(16, "Use one emoji or an icon key no longer than 16 characters.")
    .optional(),
  category: z.enum([
    "LEARNING",
    "STREAK",
    "MASTERY",
    "INDEPENDENCE",
    "SPEED",
    "EXPLORATION",
  ]),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]),
  criteriaKey: z.enum(badgeCriteriaValues),
  targetValue: z.coerce
    .number()
    .int("Target must be a whole number.")
    .min(1, "Target must be at least 1.")
    .max(1_000_000, "Target cannot exceed 1,000,000."),
  isHidden: z.boolean(),
  isActive: z.boolean(),
});
