import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** One summarized PostgreSQL execution plan produced by the local audit. */
export type RankingPlanMeasurement = {
  scope: "all-time" | "country" | "fellowship" | "league";
  eligibleRows: number;
  planningTimeMs: number;
  executionTimeMs: number;
  rootActualRows: number;
  rootTotalCost: number;
  nodeTypes: string[];
  indexes: string[];
  sorts: Array<{
    method: string;
    spaceType: string | null;
    spaceUsedKb: number | null;
  }>;
  tempReadBlocks: number;
  tempWrittenBlocks: number;
};

/** Complete result from the disposable representative-scale ranking audit. */
export type RankingPlanAuditResult = {
  populationSize: number;
  countryPopulationSize: number;
  fellowshipPopulationSize: number;
  leaguePopulationSize: number;
  measurements: RankingPlanMeasurement[];
};

type RankingPlanAuditInput = {
  populationSize: number;
  fellowshipPopulationSize: number;
  leaguePopulationSize: number;
};

type ExplainRow = {
  "QUERY PLAN": unknown;
};

type ExplainDocument = {
  Plan: ExplainNode;
  "Planning Time": number;
  "Execution Time": number;
};

type ExplainNode = {
  "Node Type": string;
  "Actual Rows"?: number;
  "Total Cost"?: number;
  "Index Name"?: string;
  "Sort Method"?: string;
  "Sort Space Type"?: string;
  "Sort Space Used"?: number;
  "Temp Read Blocks"?: number;
  "Temp Written Blocks"?: number;
  Plans?: ExplainNode[];
};

type AuditFixtureCounts = {
  users: bigint;
  profiles: bigint;
  weeks: bigint;
  scores: bigint;
  leagueMemberships: bigint;
  fellowships: bigint;
  fellowshipMembers: bigint;
};

const auditTransactionOptions = {
  maxWait: 10_000,
  timeout: 120_000,
} as const;

/**
 * Carries completed measurements across the intentional transaction rollback.
 *
 * Throwing from Prisma's interactive transaction is deliberate: it guarantees
 * PostgreSQL rolls back every synthetic identity, score, and membership even if
 * a future maintainer adds another measurement and forgets manual cleanup.
 */
class CompletedRankingAuditRollback extends Error {
  constructor(readonly result: RankingPlanAuditResult) {
    super("Representative ranking audit completed; roll back synthetic fixtures.");
    this.name = "CompletedRankingAuditRollback";
  }
}

/** Rejects unreasonable fixture sizes before any database operation begins. */
function validateAuditInput(input: RankingPlanAuditInput): void {
  if (
    !Number.isSafeInteger(input.populationSize) ||
    input.populationSize < 1_000 ||
    input.populationSize > 50_000
  ) {
    throw new Error("Ranking audit population must be between 1,000 and 50,000.");
  }
  if (
    !Number.isSafeInteger(input.fellowshipPopulationSize) ||
    input.fellowshipPopulationSize < 1 ||
    input.fellowshipPopulationSize > input.populationSize
  ) {
    throw new Error("Fellowship audit population must fit within the total population.");
  }
  if (
    !Number.isSafeInteger(input.leaguePopulationSize) ||
    input.leaguePopulationSize < 1 ||
    input.leaguePopulationSize > input.populationSize
  ) {
    throw new Error("League audit population must fit within the total population.");
  }
}

/** Reads all fixture-sensitive table counts in one round trip. */
async function getAuditFixtureCounts(
  client: Prisma.TransactionClient | typeof prisma,
): Promise<AuditFixtureCounts> {
  const [counts] = await client.$queryRaw<AuditFixtureCounts[]>(Prisma.sql`
    SELECT
      (SELECT COUNT(*) FROM "user") AS users,
      (SELECT COUNT(*) FROM "UserProfile") AS profiles,
      (SELECT COUNT(*) FROM "BeaconWeek") AS weeks,
      (SELECT COUNT(*) FROM "BeaconWeeklyScore") AS scores,
      (SELECT COUNT(*) FROM "BeaconLeagueMembership") AS "leagueMemberships",
      (SELECT COUNT(*) FROM "Fellowship") AS fellowships,
      (SELECT COUNT(*) FROM "FellowshipMember") AS "fellowshipMembers"
  `);

  if (!counts) {
    throw new Error("Could not read local ranking-audit fixture counts.");
  }
  return counts;
}

/** Requires the isolated integration database to be clean before measurement. */
function assertEmptyAuditTables(counts: AuditFixtureCounts): void {
  const populatedTable = Object.entries(counts).find(
    ([, count]) => count !== BigInt(0),
  );
  if (populatedTable) {
    throw new Error(
      `The integration database contains ${populatedTable[0]} fixtures. ` +
        "Run the guarded test reset before the ranking audit.",
    );
  }
}

/** Converts unknown PostgreSQL JSON into a narrowly validated plan document. */
function parseExplainDocument(value: unknown): ExplainDocument {
  const documents = Array.isArray(value) ? value : [];
  const document = documents[0];
  if (!document || typeof document !== "object") {
    throw new Error("PostgreSQL returned an unreadable ranking execution plan.");
  }
  const record = document as Record<string, unknown>;
  if (
    !record.Plan ||
    typeof record.Plan !== "object" ||
    typeof record["Planning Time"] !== "number" ||
    typeof record["Execution Time"] !== "number"
  ) {
    throw new Error("PostgreSQL ranking plan is missing timing or root-plan data.");
  }
  return {
    Plan: record.Plan as ExplainNode,
    "Planning Time": record["Planning Time"],
    "Execution Time": record["Execution Time"],
  };
}

/** Walks nested plan nodes to expose index, sort, and temporary-disk evidence. */
function summarizePlan(
  scope: RankingPlanMeasurement["scope"],
  eligibleRows: number,
  document: ExplainDocument,
): RankingPlanMeasurement {
  const nodeTypes = new Set<string>();
  const indexes = new Set<string>();
  const sorts: RankingPlanMeasurement["sorts"] = [];

  const visit = (node: ExplainNode): void => {
    if (typeof node["Node Type"] !== "string") {
      throw new Error("PostgreSQL ranking plan contains an invalid node.");
    }
    nodeTypes.add(node["Node Type"]);
    if (typeof node["Index Name"] === "string") {
      indexes.add(node["Index Name"]);
    }
    if (typeof node["Sort Method"] === "string") {
      sorts.push({
        method: node["Sort Method"],
        spaceType:
          typeof node["Sort Space Type"] === "string"
            ? node["Sort Space Type"]
            : null,
        spaceUsedKb:
          typeof node["Sort Space Used"] === "number"
            ? node["Sort Space Used"]
            : null,
      });
    }
    node.Plans?.forEach(visit);
  };
  visit(document.Plan);

  return {
    scope,
    eligibleRows,
    planningTimeMs: document["Planning Time"],
    executionTimeMs: document["Execution Time"],
    rootActualRows: document.Plan["Actual Rows"] ?? 0,
    rootTotalCost: document.Plan["Total Cost"] ?? 0,
    nodeTypes: [...nodeTypes].sort(),
    indexes: [...indexes].sort(),
    sorts,
    // The root reports the complete query total. Summing child values would
    // count the same temporary blocks again through parent aggregate nodes.
    tempReadBlocks: document.Plan["Temp Read Blocks"] ?? 0,
    tempWrittenBlocks: document.Plan["Temp Written Blocks"] ?? 0,
  };
}

/** Seeds deterministic ranking fixtures inside the caller's rollback transaction. */
async function seedRankingAuditFixtures(
  transaction: Prisma.TransactionClient,
  input: RankingPlanAuditInput,
  fixtureKey: string,
): Promise<{
  weekId: string;
  cohortId: string;
  fellowshipId: string;
  currentUserId: string;
}> {
  const weekId = `${fixtureKey}-week`;
  const cohortId = `${fixtureKey}-cohort`;
  const fellowshipId = `${fixtureKey}-fellowship`;
  const currentUserId = `${fixtureKey}-user-000001`;

  // One server-side INSERT per model avoids turning the audit setup itself into
  // a 10,000-operation client loop. All values are synthetic and parameterized.
  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "user" (
      id,
      name,
      email,
      "emailVerified",
      role,
      "createdAt",
      "updatedAt"
    )
    SELECT
      ${fixtureKey} || '-user-' || LPAD(series::text, 6, '0'),
      'Performance learner ' || series,
      ${fixtureKey} || '-' || series || '@example.test',
      true,
      'USER'::"UserRole",
      TIMESTAMPTZ '2026-01-01 00:00:00+00' + series * INTERVAL '1 second',
      TIMESTAMPTZ '2026-01-01 00:00:00+00' + series * INTERVAL '1 second'
    FROM generate_series(1, ${input.populationSize}) AS series
  `);

  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "UserProfile" (
      id,
      "userId",
      "displayName",
      "countryCode",
      "beaconXp",
      "beaconLevel",
      "beaconCrowns",
      "avatarKey",
      "avatarFrameKey",
      "createdAt",
      "updatedAt"
    )
    SELECT
      ${fixtureKey} || '-profile-' || LPAD(series::text, 6, '0'),
      ${fixtureKey} || '-user-' || LPAD(series::text, 6, '0'),
      'Performance learner ' || series,
      CASE WHEN series % 2 = 1 THEN 'NG' ELSE 'US' END,
      (${input.populationSize} - series) * 37,
      1 + (series % 20),
      series % 12,
      'lion',
      'default',
      TIMESTAMPTZ '2026-01-01 00:00:00+00' + series * INTERVAL '1 second',
      TIMESTAMPTZ '2026-01-01 00:00:00+00' + series * INTERVAL '1 second'
    FROM generate_series(1, ${input.populationSize}) AS series
  `);

  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "BeaconWeek" (id, "startsAt", "endsAt", "createdAt")
    VALUES (
      ${weekId},
      TIMESTAMPTZ '2026-09-21 00:00:00+00',
      TIMESTAMPTZ '2026-09-28 00:00:00+00',
      TIMESTAMPTZ '2026-09-21 00:00:00+00'
    )
  `);

  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "BeaconLeagueCohort" (
      id,
      "weekId",
      league,
      "groupNumber",
      "createdAt"
    )
    VALUES (
      ${cohortId},
      ${weekId},
      'TRAVELER'::"BeaconLeague",
      1,
      TIMESTAMPTZ '2026-09-21 00:00:00+00'
    )
  `);

  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "BeaconWeeklyScore" (
      id,
      "weekId",
      "userId",
      points,
      "modesCompleted",
      "waypointsCompleted",
      "lastScoredAt",
      "createdAt",
      "updatedAt"
    )
    SELECT
      ${fixtureKey} || '-score-' || LPAD(series::text, 6, '0'),
      ${weekId},
      ${fixtureKey} || '-user-' || LPAD(series::text, 6, '0'),
      (${input.populationSize} - series) * 11,
      series % 75,
      series % 15,
      TIMESTAMPTZ '2026-09-21 00:00:00+00' + series * INTERVAL '1 second',
      TIMESTAMPTZ '2026-09-21 00:00:00+00',
      TIMESTAMPTZ '2026-09-21 00:00:00+00'
    FROM generate_series(1, ${input.populationSize}) AS series
  `);

  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "BeaconLeagueMembership" (
      id,
      "weekId",
      "cohortId",
      "userId",
      league,
      "createdAt"
    )
    SELECT
      ${fixtureKey} || '-league-' || LPAD(series::text, 6, '0'),
      ${weekId},
      ${cohortId},
      ${fixtureKey} || '-user-' || LPAD(series::text, 6, '0'),
      'TRAVELER'::"BeaconLeague",
      TIMESTAMPTZ '2026-09-21 00:00:00+00'
    FROM generate_series(1, ${input.leaguePopulationSize}) AS series
  `);

  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "Fellowship" (
      id,
      name,
      slug,
      "isPublic",
      "insigniaKey",
      "inviteCode",
      "createdById",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${fellowshipId},
      'Representative Performance Fellowship',
      ${fixtureKey} || '-fellowship',
      true,
      'word-star',
      ${fixtureKey} || '-invite',
      ${currentUserId},
      TIMESTAMPTZ '2026-01-01 00:00:00+00',
      TIMESTAMPTZ '2026-01-01 00:00:00+00'
    )
  `);

  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "FellowshipMember" (id, "fellowshipId", "userId", "joinedAt")
    SELECT
      ${fixtureKey} || '-member-' || LPAD(series::text, 6, '0'),
      ${fellowshipId},
      ${fixtureKey} || '-user-' || LPAD(series::text, 6, '0'),
      TIMESTAMPTZ '2026-01-01 00:00:00+00' + series * INTERVAL '1 second'
    FROM generate_series(1, ${input.fellowshipPopulationSize}) AS series
  `);

  // Transaction-local statistics make PostgreSQL plan against the synthetic
  // cardinality. The deliberate rollback also removes these temporary stats.
  await transaction.$executeRawUnsafe(`
    ANALYZE
      "user",
      "UserProfile",
      "BeaconWeek",
      "BeaconWeeklyScore",
      "BeaconLeagueCohort",
      "BeaconLeagueMembership",
      "Fellowship",
      "FellowshipMember"
  `);

  return { weekId, cohortId, fellowshipId, currentUserId };
}

/** Executes the production ranking shape and returns its JSON execution plan. */
async function explainRanking(
  transaction: Prisma.TransactionClient,
  input: {
    weekId: string;
    currentUserId: string;
    join: Prisma.Sql;
    where: Prisma.Sql;
    order: Prisma.Sql;
  },
): Promise<ExplainDocument> {
  const rows = await transaction.$queryRaw<ExplainRow[]>(Prisma.sql`
    EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
    WITH ranked AS (
      SELECT
        profile."userId" AS "userId",
        profile."displayName" AS "displayName",
        profile."avatarKey" AS "avatarKey",
        profile."avatarFrameKey" AS "avatarFrameKey",
        profile."countryCode" AS "countryCode",
        profile."lastSeenAt" AS "lastSeenAt",
        COALESCE(score.points, 0) AS "weeklyXp",
        COALESCE(score."waypointsCompleted", 0) AS "waypointsCompletedThisWeek",
        profile."beaconXp" AS "beaconXp",
        profile."beaconLevel" AS "beaconLevel",
        profile."beaconCrowns" AS crowns,
        COALESCE(league_membership.league, 'TRAVELER'::"BeaconLeague") AS league,
        ROW_NUMBER() OVER (ORDER BY ${input.order}) AS rank,
        COUNT(*) OVER () AS "totalPlayers"
      FROM "UserProfile" profile
      INNER JOIN "user" account ON account.id = profile."userId"
      LEFT JOIN "BeaconWeeklyScore" score
        ON score."userId" = profile."userId" AND score."weekId" = ${input.weekId}
      LEFT JOIN "BeaconLeagueMembership" league_membership
        ON league_membership."userId" = profile."userId"
        AND league_membership."weekId" = ${input.weekId}
      ${input.join}
      WHERE account."suspendedAt" IS NULL
      ${input.where}
    )
    SELECT * FROM ranked
    WHERE rank <= 3
      OR rank BETWEEN 4 AND 23
      OR "userId" = ${input.currentUserId}
    ORDER BY rank ASC
  `);

  const plan = rows[0]?.["QUERY PLAN"];
  return parseExplainDocument(plan);
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

/**
 * Runs production-shaped leaderboard plans against rollback-only local fixtures.
 *
 * This method is for the guarded `audit:ranking-plans` maintenance command. It
 * must never be called from an application request: it deliberately creates a
 * large synthetic population, refreshes transaction-local statistics, measures
 * query execution, then throws a private sentinel so every change rolls back.
 */
export async function runRepresentativeRankingPlanAudit(
  input: RankingPlanAuditInput,
): Promise<RankingPlanAuditResult> {
  validateAuditInput(input);
  const fixtureKey = `ranking-audit-${Date.now()}`;
  let auditFailure: unknown;

  try {
    await prisma.$transaction(async (transaction) => {
      assertEmptyAuditTables(await getAuditFixtureCounts(transaction));
      const fixture = await seedRankingAuditFixtures(transaction, input, fixtureKey);
      const countryPopulationSize = Math.ceil(input.populationSize / 2);

      // PostgreSQL executes these against one transaction connection. Keeping
      // them sequential avoids pretending Prisma Local can parallelize work on
      // its single local connection and gives each plan an independent timing.
      const allTimePlan = await explainRanking(transaction, {
        weekId: fixture.weekId,
        currentUserId: fixture.currentUserId,
        join: Prisma.empty,
        where: Prisma.empty,
        order: lifetimeOrder,
      });
      const countryPlan = await explainRanking(transaction, {
        weekId: fixture.weekId,
        currentUserId: fixture.currentUserId,
        join: Prisma.empty,
        where: Prisma.sql`AND profile."countryCode" = 'NG'`,
        order: weeklyOrder,
      });
      const fellowshipPlan = await explainRanking(transaction, {
        weekId: fixture.weekId,
        currentUserId: fixture.currentUserId,
        join: Prisma.sql`
          INNER JOIN "FellowshipMember" fellowship_member
            ON fellowship_member."userId" = profile."userId"
        `,
        where: Prisma.sql`
          AND fellowship_member."fellowshipId" = ${fixture.fellowshipId}
        `,
        order: weeklyOrder,
      });
      const leaguePlan = await explainRanking(transaction, {
        weekId: fixture.weekId,
        currentUserId: fixture.currentUserId,
        join: Prisma.empty,
        where: Prisma.sql`
          AND league_membership."cohortId" = ${fixture.cohortId}
        `,
        order: weeklyOrder,
      });

      throw new CompletedRankingAuditRollback({
        populationSize: input.populationSize,
        countryPopulationSize,
        fellowshipPopulationSize: input.fellowshipPopulationSize,
        leaguePopulationSize: input.leaguePopulationSize,
        measurements: [
          summarizePlan("all-time", input.populationSize, allTimePlan),
          summarizePlan("country", countryPopulationSize, countryPlan),
          summarizePlan(
            "fellowship",
            input.fellowshipPopulationSize,
            fellowshipPlan,
          ),
          summarizePlan("league", input.leaguePopulationSize, leaguePlan),
        ],
      });
    }, auditTransactionOptions);
  } catch (error: unknown) {
    if (error instanceof CompletedRankingAuditRollback) {
      assertEmptyAuditTables(await getAuditFixtureCounts(prisma));
      return error.result;
    }
    auditFailure = error;
  } finally {
    await prisma.$disconnect();
  }

  throw auditFailure instanceof Error
    ? auditFailure
    : new Error("Representative ranking audit failed.");
}
