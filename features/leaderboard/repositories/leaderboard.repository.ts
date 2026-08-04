import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  LeaderboardEntry,
  LeaderboardFellowshipOption,
  LeaderboardPageData,
  LeaderboardRanking,
  UserScopeRanks,
} from "@/features/leaderboard/types/leaderboard.types";

const FIRST_PAGINATED_RANK = 4;
const DEFAULT_PAGE_SIZE = 20;

type RawLeaderboardEntry = {
  userId: string;
  displayName: string;
  countryCode: string | null;
  waypointsCompleted: number;
  glowPoints: number;
  currentStreak: number;
  rank: bigint;
  totalPlayers: bigint;
};

type RankingFilter = {
  join: Prisma.Sql;
  where: Prisma.Sql;
};

/** Normalizes untrusted page values before they become SQL offsets. */
function normalizePage(page: number): number {
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

/** Keeps page sizes bounded so one request cannot force an excessive result. */
function normalizeLimit(limit: number): number {
  if (!Number.isSafeInteger(limit)) return DEFAULT_PAGE_SIZE;
  return Math.min(50, Math.max(5, limit));
}

/** Converts one internal SQL row into the public-safe response contract. */
function toLeaderboardEntry(
  row: RawLeaderboardEntry,
  currentUserId: string,
): LeaderboardEntry {
  return {
    rank: Number(row.rank),
    displayName: row.displayName,
    countryCode: row.countryCode,
    waypointsCompleted: row.waypointsCompleted,
    glowPoints: row.glowPoints,
    currentStreak: row.currentStreak,
    isCurrentUser: row.userId === currentUserId,
  };
}

/**
 * Executes one stable PostgreSQL window ranking for any authorized scope.
 *
 * WHY: `ROW_NUMBER()` gives every learner a deterministic position while the
 * final profile creation and user-ID tie breakers prevent pagination drift.
 * Raw user IDs exist only inside this repository and are converted immediately
 * into `isCurrentUser`; they are never returned to a view or client component.
 */
async function getRanking(
  currentUserId: string,
  page: number,
  limit: number,
  filter: RankingFilter,
): Promise<LeaderboardRanking> {
  const safePage = normalizePage(page);
  const safeLimit = normalizeLimit(limit);
  const pageStart = FIRST_PAGINATED_RANK + (safePage - 1) * safeLimit;
  const pageEnd = pageStart + safeLimit - 1;

  const rows = await prisma.$queryRaw<RawLeaderboardEntry[]>(Prisma.sql`
    WITH ranked AS (
      SELECT
        profile."userId" AS "userId",
        profile."displayName" AS "displayName",
        profile."countryCode" AS "countryCode",
        profile."totalWaypointsCompleted" AS "waypointsCompleted",
        profile."totalGlowPoints" AS "glowPoints",
        COALESCE(streak."currentStreak", 0) AS "currentStreak",
        ROW_NUMBER() OVER (
          ORDER BY
            profile."totalWaypointsCompleted" DESC,
            profile."totalGlowPoints" DESC,
            COALESCE(streak."currentStreak", 0) DESC,
            profile."createdAt" ASC,
            profile."userId" ASC
        ) AS rank,
        COUNT(*) OVER () AS "totalPlayers"
      FROM "UserProfile" profile
      INNER JOIN "user" account ON account.id = profile."userId"
      LEFT JOIN "UserStreak" streak ON streak."userId" = profile."userId"
      ${filter.join}
      WHERE account."suspendedAt" IS NULL
      ${filter.where}
    )
    SELECT *
    FROM ranked
    WHERE
      rank <= 3
      OR rank BETWEEN ${pageStart} AND ${pageEnd}
      OR "userId" = ${currentUserId}
    ORDER BY rank ASC
  `);

  const entries = rows.map((row) => toLeaderboardEntry(row, currentUserId));
  const totalPlayers = Number(rows[0]?.totalPlayers ?? 0);
  const paginatedEntries = entries.filter(
    (entry) => entry.rank >= pageStart && entry.rank <= pageEnd,
  );
  const currentUser = entries.find((entry) => entry.isCurrentUser) ?? null;

  return {
    podium: entries.filter((entry) => entry.rank <= 3),
    entries: paginatedEntries,
    currentUser,
    page: safePage,
    totalPages: Math.max(
      1,
      Math.ceil(Math.max(0, totalPlayers - 3) / safeLimit),
    ),
    totalPlayers,
  };
}

/** Database boundary for every privacy-safe Great Beacon ranking. */
export const leaderboardRepository = {
  /** Returns the global ranking in the canonical curriculum-first order. */
  async getGlobalRanking(
    page: number,
    limit: number,
    currentUserId: string,
  ): Promise<LeaderboardRanking> {
    return getRanking(currentUserId, page, limit, {
      join: Prisma.empty,
      where: Prisma.empty,
    });
  },

  /** Returns only profiles whose saved country matches the requested scope. */
  async getCountryRanking(
    countryCode: string,
    page: number,
    limit: number,
    currentUserId: string,
  ): Promise<LeaderboardRanking> {
    return getRanking(currentUserId, page, limit, {
      join: Prisma.empty,
      where: Prisma.sql`AND profile."countryCode" = ${countryCode}`,
    });
  },

  /**
   * Returns a fellowship ranking only after proving the current learner is a
   * member. This prevents private-group membership from leaking through IDs.
   */
  async getFellowshipRanking(
    fellowshipId: string,
    page: number,
    limit: number,
    currentUserId: string,
  ): Promise<LeaderboardRanking | null> {
    const membership = await prisma.fellowshipMember.findUnique({
      where: {
        fellowshipId_userId: {
          fellowshipId,
          userId: currentUserId,
        },
      },
      select: { id: true },
    });

    if (!membership) return null;

    return getRanking(currentUserId, page, limit, {
      join: Prisma.sql`
        INNER JOIN "FellowshipMember" membership
          ON membership."userId" = profile."userId"
      `,
      where: Prisma.sql`AND membership."fellowshipId" = ${fellowshipId}`,
    });
  },

  /** Returns only the fellowships the learner may use as ranking scopes. */
  async getUserFellowships(
    userId: string,
  ): Promise<LeaderboardFellowshipOption[]> {
    const memberships = await prisma.fellowshipMember.findMany({
      where: { userId },
      select: {
        fellowship: {
          select: { id: true, name: true },
        },
      },
      orderBy: { fellowship: { name: "asc" } },
    });

    return memberships.map(({ fellowship }) => fellowship);
  },

  /** Loads the learner's country without exposing any other profile fields. */
  async getUserCountryCode(userId: string): Promise<string | null> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { countryCode: true },
    });

    return profile?.countryCode ?? null;
  },

  /**
   * Composes one authorized page response. Invalid fellowship IDs fall back to
   * the global scope instead of revealing whether a private fellowship exists.
   */
  async getPageData(input: {
    userId: string;
    scope: "global" | "country" | "fellowship";
    fellowshipId: string | null;
    page: number;
  }): Promise<LeaderboardPageData> {
    const [countryCode, fellowships] = await Promise.all([
      this.getUserCountryCode(input.userId),
      this.getUserFellowships(input.userId),
    ]);

    let scope = input.scope;
    let activeFellowship =
      fellowships.find((item) => item.id === input.fellowshipId) ?? null;
    let ranking: LeaderboardRanking;

    if (scope === "country") {
      ranking = countryCode
        ? await this.getCountryRanking(
            countryCode,
            input.page,
            DEFAULT_PAGE_SIZE,
            input.userId,
          )
        : {
            podium: [],
            entries: [],
            currentUser: null,
            page: 1,
            totalPages: 1,
            totalPlayers: 0,
          };
    } else if (scope === "fellowship" && activeFellowship) {
      ranking =
        (await this.getFellowshipRanking(
          activeFellowship.id,
          input.page,
          DEFAULT_PAGE_SIZE,
          input.userId,
        )) ??
        (await this.getGlobalRanking(
          input.page,
          DEFAULT_PAGE_SIZE,
          input.userId,
        ));
    } else {
      scope = "global";
      activeFellowship = null;
      ranking = await this.getGlobalRanking(
        input.page,
        DEFAULT_PAGE_SIZE,
        input.userId,
      );
    }

    return {
      ...ranking,
      scope,
      countryCode,
      fellowships,
      activeFellowshipId: activeFellowship?.id ?? null,
      activeFellowshipName: activeFellowship?.name ?? null,
    };
  },

  /** Returns the learner's current position in every authorized scope. */
  async getUserRank(userId: string): Promise<UserScopeRanks> {
    const [countryCode, fellowships, global] = await Promise.all([
      this.getUserCountryCode(userId),
      this.getUserFellowships(userId),
      this.getGlobalRanking(1, 5, userId),
    ]);
    const country = countryCode
      ? await this.getCountryRanking(countryCode, 1, 5, userId)
      : null;
    const fellowshipRanks = await Promise.all(
      fellowships.map(async (fellowship) => {
        const ranking = await this.getFellowshipRanking(
          fellowship.id,
          1,
          5,
          userId,
        );
        return {
          fellowshipId: fellowship.id,
          fellowshipName: fellowship.name,
          rank: ranking?.currentUser?.rank ?? null,
        };
      }),
    );

    return {
      global: global.currentUser?.rank ?? null,
      country: country?.currentUser?.rank ?? null,
      fellowships: fellowshipRanks,
    };
  },
} as const;
