/**
 * Resets only the dedicated Scripture Memo integration-test database.
 *
 * Use this command when repository integration tests report that their isolated
 * waypoint curriculum is not empty or that its migration state has drifted:
 *
 *   npm run test:database:reset
 *
 * Required environment values (normally loaded from the local `.env` file):
 *
 * - `DATABASE_URL`: the routine application/development database.
 * - `TEST_DATABASE_URL`: a different, dedicated PostgreSQL test database.
 * - `TEST_DATABASE_CONFIRMATION`: the exact acknowledgement enforced by
 *   `requireSafeTestDatabaseUrl`.
 *
 * SECURITY AND DATA-INTEGRITY GUARANTEES:
 *
 * - The shared guard rejects a missing URL, malformed PostgreSQL URL, absent
 *   credentials, incorrect acknowledgement, or reuse of `DATABASE_URL`.
 * - The validated test URL is passed only through the child process environment;
 *   it is never printed or interpolated into a shell command.
 * - The command preserves the already-applied schema and `_prisma_migrations`
 *   history, but clears all application tables in one server-side operation.
 *   Integration suites must start empty and create their own disposable data.
 * - Post-reset counts fail closed so a human operator cannot mistake a partial
 *   cleanup for success.
 */
import "dotenv/config";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

/** Runs the data reset after every destructive-target check has passed. */
async function resetIntegrationTestDatabase(): Promise<void> {
  const applicationDatabaseUrl = process.env.DATABASE_URL;
  const testDatabaseUrl = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
  });

  // The Prisma singleton must be imported only after its datasource variable is
  // replaced. A static repository import would connect to the development
  // database before the safety guard had selected the test resource.
  process.env.DATABASE_URL = testDatabaseUrl;
  const { clearIntegrationTestDatabase } = await import(
    "@/features/dev-fixtures/repositories/integration-test-database.repository"
  );
  await clearIntegrationTestDatabase();

  console.info(
    "Dedicated integration database data reset complete; schema and migration history were preserved.",
  );
}

// Keep the script compatible with the repository's CommonJS `tsx` execution
// mode while still returning a failing process status to callers and CI.
resetIntegrationTestDatabase().catch((error: unknown) => {
  const message = error instanceof Error
    ? error.message
    : "Unknown integration database reset failure.";
  console.error(`Integration database reset failed: ${message}`);
  process.exitCode = 1;
});
