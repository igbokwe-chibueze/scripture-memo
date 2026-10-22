/**
 * Private owner-only analytics, assembled in two read-only round trips.
 * No account selector is accepted from the browser. The view supplies the verified
 * session ID; every history CTE repeats that ownership boundary. SQL aggregates
 * keep lifetime history in PostgreSQL and return bounded lists, not raw attempts.
 */
import { prisma } from "@/lib/prisma";
import {
  isValidTimeZone,
  getZonedCalendarDateKey,
} from "@/features/progression/lib/streak-utils";
import { calculateHintBalance } from "@/features/hints/lib/hint-balance";
import { FREE_AVATAR_KEYS } from "@/features/profile/data/avatar-catalog";
import { HINT_PACK_ITEM_TYPE } from "@/features/oil-shop/data/hint-shop-catalog";
import { getActivityRange } from "../lib/activity-calendar";
import {
  statsAggregateSchema,
  statsOwnerSchema,
  type StatsPeriod,
} from "../schemas/player-stats.schema";
import type { PlayerStatsData } from "../types/player-stats.types";

/** Parameterized queries share one account boundary and never repair or initialize history. */
export const playerStatsRepository = {
  async getForPlayer(
    userId: string,
    requestedPeriod: StatsPeriod,
    now = new Date(),
  ): Promise<PlayerStatsData | null> {
    const owners = await prisma.$queryRaw<unknown[]>`
      SELECT p."publicId", p."displayName", p."username", p."avatarKey", p."avatarFrameKey",
        u."createdAt" AS "joinedAt", COALESCE(s."timeZone", 'UTC') AS "timeZone",
        p."totalGlowPoints" AS "glowBalance", p."startingHintAllowance",
        p."beaconXp", p."beaconLevel", p."beaconCrowns" AS "crowns",
        COALESCE(st."currentStreak", 0) AS "currentStreak",
        COALESCE(st."bestStreak", 0) AS "bestStreak"
      FROM "user" u
      JOIN "UserProfile" p ON p."userId" = u.id
      LEFT JOIN "UserSettings" s ON s."userId" = u.id
      LEFT JOIN "UserStreak" st ON st."userId" = u.id
      WHERE u.id = ${userId} AND u.banned = false AND u."suspendedAt" IS NULL
    `;
    if (!owners.length) return null;
    const owner = statsOwnerSchema.parse(owners[0]);
    const timeZone = isValidTimeZone(owner.timeZone) ? owner.timeZone : "UTC";
    const currentYear = Number(
      getZonedCalendarDateKey(now, timeZone).slice(0, 4),
    );
    const period =
      requestedPeriod !== "recent" && requestedPeriod > currentYear
        ? "recent"
        : requestedPeriod;
    const range = getActivityRange(period, now, timeZone);

    // Materialized owner-filtered attempts are reused by all mode and activity
    // summaries. The chart returns at most 366 grouped dates, even after years
    // of use. AT TIME ZONE first interprets Prisma's timestamp as UTC, then uses
    // the account's IANA zone; browser zones and DST never move a calendar cell.
    const rows = await prisma.$queryRaw<{ data: unknown }[]>`
      WITH attempts AS MATERIALIZED (
        SELECT a."gameMode", a.status, a."attemptNumber", a."durationMs", a."completedAt",
          g."isVaultReplay", g.translation
        FROM "GameModeAttempt" a
        JOIN "GameSession" g ON g.id = a."gameSessionId"
        WHERE a."userId" = ${userId} AND g."userId" = ${userId} AND NOT g."isAdminTest"
      ),
      activity AS MATERIALIZED (
        SELECT to_char(a."completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS date,
          COUNT(*) FILTER (WHERE NOT a."isVaultReplay") AS learning,
          COUNT(*) FILTER (WHERE a."isVaultReplay") AS practice
        FROM attempts a
        WHERE a.status = 'COMPLETED' AND a."completedAt" IS NOT NULL AND a."completedAt" <= ${now}
        GROUP BY date
      ),
      progress AS MATERIALIZED (
        SELECT p.status, p."startedAt", w.number, w."journeyStage", w."verseId", v.book
        FROM "UserWaypointProgress" p
        JOIN "Waypoint" w ON w.id = p."waypointId"
        LEFT JOIN "Verse" v ON v.id = w."verseId"
        WHERE p."userId" = ${userId}
      ),
      verse_progress AS MATERIALIZED (
        SELECT "verseId", MAX(book) AS book,
          bool_or(status = 'COMPLETED' AND "journeyStage" = 'LEARN') AS completed,
          COUNT(DISTINCT "journeyStage") FILTER (WHERE status = 'COMPLETED') = 4 AS mastered,
          bool_or("startedAt" IS NOT NULL OR status IN ('IN_PROGRESS', 'COOLDOWN', 'COMPLETED')) AS encountered
        FROM progress WHERE "verseId" IS NOT NULL GROUP BY "verseId"
      ),
      earned AS MATERIALIZED (
        SELECT b.id, b.rarity FROM "UserBadgeProgress" p
        JOIN "Badge" b ON b.id = p."badgeId"
        WHERE p."userId" = ${userId} AND p.status = 'COMPLETED' AND p."unlockedAt" IS NOT NULL
      ),
      hint_uses AS MATERIALIZED (
        SELECT g."isVaultReplay" FROM "HintUsage" h
        JOIN "GameSession" g ON g.id = h."gameSessionId"
        WHERE h."userId" = ${userId} AND g."userId" = ${userId} AND NOT g."isAdminTest"
      )
      SELECT jsonb_build_object(
        'journey', jsonb_build_object(
          'completedWaypoints', (SELECT COUNT(*) FROM progress WHERE status = 'COMPLETED'),
          'activeWaypoints', (SELECT COUNT(*) FROM progress WHERE status IN ('UNLOCKED', 'IN_PROGRESS', 'COOLDOWN')),
          'highestWaypoint', (SELECT COALESCE(MAX(number), 0) FROM progress WHERE status = 'COMPLETED'),
          'versesEncountered', (SELECT COUNT(*) FROM verse_progress WHERE encountered),
          'completedVerses', (SELECT COUNT(*) FROM verse_progress WHERE completed),
          'masteredVerses', (SELECT COUNT(*) FROM verse_progress WHERE mastered),
          'booksExplored', (SELECT COUNT(DISTINCT book) FROM verse_progress WHERE encountered),
          'favorites', (SELECT COUNT(*) FROM "UserFavoriteVerse" WHERE "userId" = ${userId}),
          'notes', (SELECT COUNT(*) FROM "UserVerseNote" WHERE "userId" = ${userId})
        ),
        'sessions', (
          SELECT jsonb_build_object(
            'learning', COUNT(*) FILTER (WHERE NOT "isVaultReplay"),
            'practice', COUNT(*) FILTER (WHERE "isVaultReplay"),
            'finishedLearning', COUNT(*) FILTER (WHERE NOT "isVaultReplay" AND status = 'COMPLETED'),
            'finishedPractice', COUNT(*) FILTER (WHERE "isVaultReplay" AND status = 'COMPLETED')
          ) FROM "GameSession" WHERE "userId" = ${userId} AND NOT "isAdminTest"
        ),
        'modes', COALESCE((SELECT jsonb_agg(mode_row) FROM (
          SELECT "gameMode" AS mode,
            COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
            COUNT(*) FILTER (WHERE status = 'COMPLETED' AND NOT "isVaultReplay") AS learning,
            COUNT(*) FILTER (WHERE status = 'COMPLETED' AND "isVaultReplay") AS practice,
            COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
            COUNT(*) FILTER (WHERE status = 'EXPIRED') AS expired,
            COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS "inProgress",
            COUNT(*) FILTER (WHERE status = 'COMPLETED' AND "attemptNumber" = 1) AS "firstTry",
            COALESCE(SUM("durationMs") FILTER (WHERE status <> 'IN_PROGRESS' AND "durationMs" >= 0), 0) AS "recordedMs",
            COUNT(*) FILTER (WHERE status <> 'IN_PROGRESS' AND "durationMs" >= 0) AS "timedAttempts",
            MIN("durationMs") FILTER (WHERE status = 'COMPLETED' AND "durationMs" >= 0) AS "fastestMs",
            AVG("durationMs") FILTER (WHERE status = 'COMPLETED' AND "durationMs" >= 0) AS "averageMs"
          FROM attempts GROUP BY "gameMode"
        ) mode_row), '[]'::jsonb),
        'stages', COALESCE((SELECT jsonb_agg(stage_row) FROM (
          SELECT "journeyStage" AS stage,
            COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed,
            COUNT(*) FILTER (WHERE status IN ('UNLOCKED', 'IN_PROGRESS', 'COOLDOWN')) AS active
          FROM progress GROUP BY "journeyStage"
        ) stage_row), '[]'::jsonb),
        'challenges', COALESCE((SELECT jsonb_agg(day_row) FROM (
          SELECT "dayLevel" AS level, COUNT(*) AS completed FROM "UserDayProgress"
          WHERE "userId" = ${userId} AND status = 'COMPLETED' GROUP BY "dayLevel"
        ) day_row), '[]'::jsonb),
        'badges', COALESCE((SELECT jsonb_agg(badge_row) FROM (
          SELECT rarity, COUNT(*) AS earned FROM earned GROUP BY rarity
        ) badge_row), '[]'::jsonb),
        'availableBadges', (SELECT COUNT(*) FROM "Badge" b
          WHERE (b."isActive" AND NOT b."isHidden") OR EXISTS (SELECT 1 FROM earned e WHERE e.id = b.id)),
        'beacon', jsonb_build_object(
          'weeklyXp', (SELECT COALESCE(SUM(s.points), 0) FROM "BeaconWeeklyScore" s
            JOIN "BeaconWeek" w ON w.id = s."weekId"
            WHERE s."userId" = ${userId} AND w."startsAt" <= ${now} AND w."endsAt" > ${now}),
          'highestLeague', (SELECT m.league::text FROM "BeaconLeagueMembership" m WHERE m."userId" = ${userId} ORDER BY m.league DESC LIMIT 1),
          'finishedWeeks', (SELECT COUNT(*) FROM "BeaconLeagueMembership" m JOIN "BeaconWeek" w ON w.id = m."weekId"
            WHERE m."userId" = ${userId} AND m."finalRank" IS NOT NULL AND w."endsAt" <= ${now}),
          'weeklyWins', (SELECT COUNT(*) FROM "BeaconLeagueMembership" m JOIN "BeaconWeek" w ON w.id = m."weekId"
            WHERE m."userId" = ${userId} AND m."finalRank" = 1 AND w."endsAt" <= ${now}),
          'bestRank', (SELECT MIN(m."finalRank") FROM "BeaconLeagueMembership" m JOIN "BeaconWeek" w ON w.id = m."weekId"
            WHERE m."userId" = ${userId} AND m."finalRank" > 0 AND w."endsAt" <= ${now})
        ),
        'books', COALESCE((SELECT jsonb_agg(book_row ORDER BY book_row.completed DESC, book_row.book) FROM (
          SELECT book, COUNT(*) FILTER (WHERE completed) AS completed,
            COUNT(*) FILTER (WHERE mastered) AS mastered
          FROM verse_progress WHERE encountered GROUP BY book
        ) book_row), '[]'::jsonb),
        'translations', COALESCE((SELECT jsonb_agg(translation_row) FROM (
          SELECT translation, COUNT(*) AS completed FROM attempts
          WHERE status = 'COMPLETED' GROUP BY translation
        ) translation_row), '[]'::jsonb),
        'rewards', (
          SELECT jsonb_build_object(
            'challengeGlow', COALESCE(SUM(amount) FILTER (WHERE "eventType" = 'DAY_COMPLETE' AND amount > 0), 0),
            'badgeGlow', COALESCE(SUM(amount) FILTER (WHERE "eventType" = 'BADGE_UNLOCK' AND amount > 0), 0),
            'adminGlow', COALESCE(SUM(amount) FILTER (WHERE "eventType" = 'MANUAL_ADMIN_AWARD'), 0),
            'glowSpent', COALESCE(-SUM(amount) FILTER (WHERE "eventType" = 'SHOP_PURCHASE' AND amount < 0), 0)
          ) FROM "RewardLedger" WHERE "userId" = ${userId}
        ),
        'inventory', jsonb_build_object(
          'hintUses', (SELECT COUNT(*) FROM hint_uses),
          'practiceHints', (SELECT COUNT(*) FROM hint_uses WHERE "isVaultReplay"),
          'purchasedHints', (SELECT COALESCE(SUM(p."entitlementQuantity"), 0) FROM "UserShopPurchase" p
            JOIN "ShopItem" i ON i.id = p."shopItemId" WHERE p."userId" = ${userId} AND i."itemType" = ${HINT_PACK_ITEM_TYPE}),
          'purchases', (SELECT COUNT(*) FROM "UserShopPurchase" WHERE "userId" = ${userId}),
          'ownedAvatars', (SELECT COUNT(*) FROM "UserAvatarOwnership" WHERE "userId" = ${userId}) + ${FREE_AVATAR_KEYS.length}
        ),
        'social', jsonb_build_object(
          'friends', (SELECT COUNT(*) FROM "PlayerFriendship" f
            JOIN "user" peer ON peer.id = CASE WHEN f."lowUserId" = ${userId} THEN f."highUserId" ELSE f."lowUserId" END
            WHERE f.status = 'ACCEPTED' AND (f."lowUserId" = ${userId} OR f."highUserId" = ${userId})
              AND NOT peer.banned AND peer."suspendedAt" IS NULL),
          'fellowships', (SELECT COUNT(*) FROM "FellowshipMember" WHERE "userId" = ${userId})
        ),
        'activeDays', (SELECT COUNT(*) FROM activity),
        'firstActiveDay', (SELECT MIN(date) FROM activity),
        'lastActiveDay', (SELECT MAX(date) FROM activity),
        'days', COALESCE((SELECT jsonb_agg(day_row ORDER BY day_row.date) FROM (
          SELECT date, learning, practice FROM activity WHERE date >= ${range.start} AND date <= ${range.end}
        ) day_row), '[]'::jsonb)
      ) AS data
    `;
    const totals = statsAggregateSchema.parse(rows[0]?.data);
    const firstYear = Math.max(
      1900,
      Math.min(
        Number(getZonedCalendarDateKey(owner.joinedAt, timeZone).slice(0, 4)),
        Number(totals.firstActiveDay?.slice(0, 4) ?? currentYear),
        period === "recent" ? currentYear : period,
      ),
    );
    const { startingHintAllowance, ...identity } = owner;
    return {
      owner: { ...identity, timeZone, joinedAt: owner.joinedAt.toISOString() },
      totals,
      hintsRemaining: calculateHintBalance(
        totals.inventory.hintUses,
        totals.inventory.purchasedHints,
        startingHintAllowance,
      ),
      period,
      range,
      years: Array.from(
        { length: Math.max(1, currentYear - firstYear + 1) },
        (_, offset) => currentYear - offset,
      ),
    };
  },
};
