/**
 * Measure production-shaped leaderboard queries with disposable local data.
 *
 * Use this script only for Phase 31 performance auditing:
 *
 *   npm run audit:ranking-plans
 *
 * Required environment values, normally supplied by the local `.env` file:
 *
 * - `DATABASE_URL`: the routine development database on port 51214.
 * - `TEST_DATABASE_URL`: the isolated Prisma Local test database on port 51224.
 * - `TEST_DATABASE_CONFIRMATION`: `scripture-memo-integration-tests`.
 *
 * SAFETY AND DATA-INTEGRITY GUARANTEES:
 *
 * - The shared guard rejects production, hosted databases, missing credentials,
 *   unsupported connection overrides, and reuse of the development listener.
 * - The guarded test URL replaces `DATABASE_URL` only inside this Node process;
 *   no environment file, migration, schema, or development data is changed.
 * - The repository requires empty ranking tables, inserts all synthetic data in
 *   one transaction, and deliberately throws after collecting the plans so
 *   PostgreSQL rolls back fixtures and transaction-local statistics.
 * - A post-rollback count verifies that no users, scores, leagues, Fellowships,
 *   or memberships remain. Failures never print connection strings or secrets.
 *
 * The chosen sizes are large enough to expose window-sort and index behavior
 * while keeping the local audit quick: 10,000 total learners, 5,000 country
 * learners, a 2,000-member Fellowship, and a 2,500-member league cohort.
 */
import "dotenv/config";

import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

/** Selects the isolated datasource before importing the Prisma repository. */
async function runRankingPlanAudit(): Promise<void> {
  const testDatabaseUrl = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl: process.env.DATABASE_URL,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
  });

  // Dynamic import is essential: lib/prisma reads DATABASE_URL at module load.
  // Setting the guarded URL first prevents any connection to development data.
  process.env.DATABASE_URL = testDatabaseUrl;
  const { runRepresentativeRankingPlanAudit } = await import(
    "@/features/leaderboard/repositories/leaderboard-performance.repository"
  );
  const result = await runRepresentativeRankingPlanAudit({
    populationSize: 10_000,
    fellowshipPopulationSize: 2_000,
    leaguePopulationSize: 2_500,
  });

  console.info(
    `Representative ranking plans completed for ${result.populationSize} ` +
      "rollback-only local learners.",
  );
  for (const measurement of result.measurements) {
    const sortSummary = measurement.sorts.length > 0
      ? measurement.sorts
          .map((sort) =>
            [
              sort.method,
              sort.spaceType,
              sort.spaceUsedKb === null ? null : `${sort.spaceUsedKb} kB`,
            ]
              .filter(Boolean)
              .join(" / "),
          )
          .join(", ")
      : "none reported";
    const indexSummary = measurement.indexes.length > 0
      ? measurement.indexes.join(", ")
      : "none";

    console.info(
      `${measurement.scope}: ${measurement.eligibleRows} eligible rows; ` +
        `${measurement.executionTimeMs.toFixed(3)} ms execution; ` +
        `${measurement.planningTimeMs.toFixed(3)} ms planning; ` +
        `indexes [${indexSummary}]; sorts [${sortSummary}]; ` +
        `temp blocks ${measurement.tempReadBlocks} read / ` +
        `${measurement.tempWrittenBlocks} written.`,
    );
  }
  console.info("Rollback verification passed; the integration tables remain empty.");
}

runRankingPlanAudit().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : "Unknown representative ranking-audit failure.";
  console.error(`Representative ranking audit failed: ${message}`);
  process.exitCode = 1;
});
