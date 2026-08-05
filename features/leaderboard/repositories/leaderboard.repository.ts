import { Prisma } from "@/lib/generated/prisma/client";
import { BeaconLeague } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  BEACON_DEMOTION_COUNT,
  BEACON_PROMOTION_COUNT,
} from "@/features/beacon/constants/beacon-progression";
import { beaconRepository } from "@/features/beacon/repositories/beacon.repository";
import { getBeaconWeekWindow } from "@/features/beacon/lib/beacon-week";
import {
  normalizeAvatarFrameKey,
  normalizeAvatarKey,
} from "@/features/profile/data/avatar-catalog";
import type {
  LeaderboardEntry,
  LeaderboardFellowshipOption,
  LeaderboardPageData,
  LeaderboardRanking,
  LeaderboardScope,
  UserScopeRanks,
} from "@/features/leaderboard/types/leaderboard.types";

const FIRST_PAGINATED_RANK = 4;
const DEFAULT_PAGE_SIZE = 20;

type RawLeaderboardEntry = {
  userId: string;
  displayName: string;
  avatarKey: string;
  avatarFrameKey: string;
  countryCode: string | null;
  weeklyXp: number;
  waypointsCompletedThisWeek: number;
  beaconXp: number;
  beaconLevel: number;
  crowns: number;
  league: BeaconLeague;
  rank: bigint;
  totalPlayers: bigint;
};

type RankingQuery = {
  join: Prisma.Sql;
  where: Prisma.Sql;
  order: Prisma.Sql;
};

function normalizePage(page: number): number {
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function normalizeLimit(limit: number): number {
  if (!Number.isSafeInteger(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(50, Math.max(5, limit));
}

/** Removes internal identity immediately after the raw ranking query. */
function toLeaderboardEntry(
  row: RawLeaderboardEntry,
  currentUserId: string,
): LeaderboardEntry {
  return {
    rank: Number(row.rank),
    displayName: row.displayName,
    avatarKey: normalizeAvatarKey(row.avatarKey),
    avatarFrameKey: normalizeAvatarFrameKey(row.avatarFrameKey),
    countryCode: row.countryCode,
    weeklyXp: row.weeklyXp,
    waypointsCompletedThisWeek: row.waypointsCompletedThisWeek,
    beaconXp: row.beaconXp,
    beaconLevel: row.beaconLevel,
    crowns: row.crowns,
    league: row.league,
    isCurrentUser: row.userId === currentUserId,
  };
}

/** Executes one privacy-safe weekly or lifetime ranking window. */
async function getRanking(input: {
  currentUserId: string;
  weekId: string;
  page: number;
  limit: number;
  query: RankingQuery;
}): Promise<LeaderboardRanking> {
  const page = normalizePage(input.page);
  const limit = normalizeLimit(input.limit);
  const pageStart = FIRST_PAGINATED_RANK + (page - 1) * limit;
  const pageEnd = pageStart + limit - 1;
  const rows = await prisma.$queryRaw<RawLeaderboardEntry[]>(Prisma.sql`
    WITH ranked AS (
      SELECT
        profile."userId" AS "userId",
        profile."displayName" AS "displayName",
        profile."avatarKey" AS "avatarKey",
        profile."avatarFrameKey" AS "avatarFrameKey",
        profile."countryCode" AS "countryCode",
        COALESCE(score.points, 0) AS "weeklyXp",
        COALESCE(score."waypointsCompleted", 0) AS "waypointsCompletedThisWeek",
        profile."beaconXp" AS "beaconXp",
        profile."beaconLevel" AS "beaconLevel",
        profile."beaconCrowns" AS crowns,
        COALESCE(league_membership.league, 'TRAVELER'::"BeaconLeague") AS league,
        ROW_NUMBER() OVER (ORDER BY ${input.query.order}) AS rank,
        COUNT(*) OVER () AS "totalPlayers"
      FROM "UserProfile" profile
      INNER JOIN "user" account ON account.id = profile."userId"
      LEFT JOIN "BeaconWeeklyScore" score
        ON score."userId" = profile."userId" AND score."weekId" = ${input.weekId}
      LEFT JOIN "BeaconLeagueMembership" league_membership
        ON league_membership."userId" = profile."userId"
        AND league_membership."weekId" = ${input.weekId}
      ${input.query.join}
      WHERE account."suspendedAt" IS NULL
      ${input.query.where}
    )
    SELECT * FROM ranked
    WHERE rank <= 3
      OR rank BETWEEN ${pageStart} AND ${pageEnd}
      OR "userId" = ${input.currentUserId}
    ORDER BY rank ASC
  `);
  const entries = rows.map((row) =>
    toLeaderboardEntry(row, input.currentUserId),
  );
  const totalPlayers = Number(rows[0]?.totalPlayers ?? 0);

  return {
    podium: entries.filter((entry) => entry.rank <= 3),
    entries: entries.filter(
      (entry) => entry.rank >= pageStart && entry.rank <= pageEnd,
    ),
    currentUser: entries.find((entry) => entry.isCurrentUser) ?? null,
    page,
    totalPages: Math.max(1, Math.ceil(Math.max(0, totalPlayers - 3) / limit)),
    totalPlayers,
  };
}

const weeklyOrder = Prisma.sql`
  COALESCE(score.points, 0) DESC,
  COALESCE(score."waypointsCompleted", 0) DESC,
  score."lastScoredAt" ASC NULLS LAST,
  profile."createdAt" ASC,
  profile."userId" ASC
`;

const lifetimeOrder = Prisma.sql`
  profile."beaconLevel" DESC,
  profile."beaconXp" DESC,
  profile."createdAt" ASC,
  profile."userId" ASC
`;

/** Database boundary for Great Beacon competition and recognition views. */
export const leaderboardRepository = {
  async getUserFellowships(
    userId: string,
  ): Promise<LeaderboardFellowshipOption[]> {
    const memberships = await prisma.fellowshipMember.findMany({
      where: { userId },
      select: { fellowship: { select: { id: true, name: true } } },
      orderBy: { fellowship: { name: "asc" } },
    });
    return memberships.map(({ fellowship }) => fellowship);
  },

  async getUserCountryCode(userId: string): Promise<string | null> {
    return (
      await prisma.userProfile.findUnique({
        where: { userId },
        select: { countryCode: true },
      })
    )?.countryCode ?? null;
  },

  async getPageData(input: {
    userId: string;
    scope: LeaderboardScope;
    fellowshipId: string | null;
    page: number;
  }): Promise<LeaderboardPageData> {
    const now = new Date();
    const [competition, countryCode, fellowships] = await Promise.all([
      beaconRepository.getCurrentMembership(input.userId, now),
      this.getUserCountryCode(input.userId),
      this.getUserFellowships(input.userId),
    ]);
    if (!competition) {
      const week = getBeaconWeekWindow(now);
      return {
        scope: input.scope,
        countryCode,
        fellowships,
        activeFellowshipId: null,
        activeFellowshipName: null,
        league: BeaconLeague.TRAVELER,
        weekStartsAt: week.startsAt.toISOString(),
        weekEndsAt: week.endsAt.toISOString(),
        promotionCount: BEACON_PROMOTION_COUNT,
        demotionCount: BEACON_DEMOTION_COUNT,
        needsEnrollment: true,
        podium: [],
        entries: [],
        currentUser: null,
        page: 1,
        totalPages: 1,
        totalPlayers: 0,
      };
    }
    let scope = input.scope;
    let activeFellowship =
      fellowships.find((item) => item.id === input.fellowshipId) ?? null;
    let query: RankingQuery;

    if (scope === "country" && countryCode) {
      query = {
        join: Prisma.empty,
        where: Prisma.sql`AND profile."countryCode" = ${countryCode}`,
        order: weeklyOrder,
      };
    } else if (scope === "fellowship" && activeFellowship) {
      query = {
        join: Prisma.sql`
          INNER JOIN "FellowshipMember" fellowship_member
            ON fellowship_member."userId" = profile."userId"
        `,
        where: Prisma.sql`
          AND fellowship_member."fellowshipId" = ${activeFellowship.id}
        `,
        order: weeklyOrder,
      };
    } else if (scope === "all-time") {
      activeFellowship = null;
      query = { join: Prisma.empty, where: Prisma.empty, order: lifetimeOrder };
    } else {
      scope = "league";
      activeFellowship = null;
      query = {
        join: Prisma.empty,
        where: Prisma.sql`
          AND league_membership."cohortId" = ${competition.cohortId}
        `,
        order: weeklyOrder,
      };
    }

    const ranking = await getRanking({
      currentUserId: input.userId,
      weekId: competition.weekId,
      page: input.page,
      limit: DEFAULT_PAGE_SIZE,
      query,
    });
    return {
      ...ranking,
      needsEnrollment: false,
      scope,
      countryCode,
      fellowships,
      activeFellowshipId: activeFellowship?.id ?? null,
      activeFellowshipName: activeFellowship?.name ?? null,
      league: competition.league,
      weekStartsAt: competition.startsAt.toISOString(),
      weekEndsAt: competition.endsAt.toISOString(),
      promotionCount: BEACON_PROMOTION_COUNT,
      demotionCount: BEACON_DEMOTION_COUNT,
    };
  },

  /** Retains the badge engine's permanent global top-100 lookup. */
  async getUserRank(userId: string): Promise<UserScopeRanks> {
    const data = await this.getPageData({
      userId,
      scope: "all-time",
      fellowshipId: null,
      page: 1,
    });
    return { global: data.currentUser?.rank ?? null, country: null, fellowships: [] };
  },
} as const;
