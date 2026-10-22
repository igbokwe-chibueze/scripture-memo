/** Strict, bounded filters and database aggregate contracts for private statistics. */
import { z } from "@/lib/zod";

const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const duration = z.number().nonnegative().max(Number.MAX_SAFE_INTEGER);

/** Only a period can be requested: no route/filter can select another account. */
export const playerStatsFilterSchema = z.object({
  year: z
    .union([
      z.literal("recent"),
      z
        .string()
        .regex(/^\d{4}$/)
        .transform(Number)
        .pipe(z.number().int().min(1900).max(9999)),
    ])
    .catch("recent"),
});

/** Small owner row; private auth IDs and contact information are not selected. */
export const statsOwnerSchema = z.object({
  publicId: z.string().uuid(),
  displayName: z.string(),
  username: z.string().nullable(),
  avatarKey: z.string(),
  avatarFrameKey: z.string(),
  joinedAt: z.date(),
  timeZone: z.string(),
  glowBalance: count,
  startingHintAllowance: count,
  beaconXp: count,
  beaconLevel: count,
  crowns: count,
  currentStreak: count,
  bestStreak: count,
});

/** Day keys are calendar labels, not instants to be converted by the browser. */
export const activityDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  learning: count,
  practice: count,
});

/** Validate aggregate JSON before turning it into a browser-safe private DTO. */
export const statsAggregateSchema = z.object({
  journey: z.object({
    completedWaypoints: count,
    activeWaypoints: count,
    highestWaypoint: count,
    versesEncountered: count,
    completedVerses: count,
    masteredVerses: count,
    favorites: count,
    notes: count,
    booksExplored: count,
  }),
  sessions: z.object({
    learning: count,
    practice: count,
    finishedLearning: count,
    finishedPractice: count,
  }),
  modes: z
    .array(
      z.object({
        mode: z.enum(["DRAG_DROP", "PUZZLE", "SWAP", "CUE", "FILL"]),
        completed: count,
        learning: count,
        practice: count,
        failed: count,
        expired: count,
        inProgress: count,
        firstTry: count,
        recordedMs: duration,
        timedAttempts: count,
        fastestMs: duration.nullable(),
        averageMs: duration.nullable(),
      }),
    )
    .max(5),
  stages: z
    .array(
      z.object({
        stage: z.enum(["LEARN", "RECALL", "STRENGTHEN", "MASTER"]),
        completed: count,
        active: count,
      }),
    )
    .max(4),
  challenges: z
    .array(
      z.object({
        level: z.enum(["GLIMMER", "GLOW", "RADIANCE"]),
        completed: count,
      }),
    )
    .max(3),
  badges: z
    .array(
      z.object({
        rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"]),
        earned: count,
      }),
    )
    .max(5),
  availableBadges: count,
  beacon: z.object({
    weeklyXp: count,
    highestLeague: z.string().nullable(),
    finishedWeeks: count,
    weeklyWins: count,
    bestRank: count.nullable(),
  }),
  books: z
    .array(z.object({ book: z.string(), completed: count, mastered: count }))
    .max(66),
  translations: z
    .array(z.object({ translation: z.string(), completed: count }))
    .max(5),
  rewards: z.object({
    challengeGlow: count,
    badgeGlow: count,
    adminGlow: z.number(),
    glowSpent: count,
  }),
  inventory: z.object({
    hintUses: count,
    practiceHints: count,
    purchasedHints: count,
    purchases: count,
    ownedAvatars: count,
  }),
  social: z.object({ friends: count, fellowships: count }),
  activeDays: count,
  firstActiveDay: z.string().nullable(),
  lastActiveDay: z.string().nullable(),
  days: z.array(activityDaySchema).max(366),
});

export type StatsPeriod = z.infer<typeof playerStatsFilterSchema>["year"];
export type ActivityDay = z.infer<typeof activityDaySchema>;
export type StatsAggregate = z.infer<typeof statsAggregateSchema>;
export type StatsOwner = z.infer<typeof statsOwnerSchema>;
