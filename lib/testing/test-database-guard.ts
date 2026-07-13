/** Required acknowledgement for the dedicated Scripture Memo integration database. */
const EXPECTED_TEST_DATABASE_CONFIRMATION = "scripture-memo-integration-tests";

type TestDatabaseGuardInput = {
  applicationDatabaseUrl: string | undefined;
  confirmation: string | undefined;
  testDatabaseUrl: string | undefined;
};

/**
 * Refuses destructive integration testing unless the environment explicitly
 * identifies the separately provisioned Prisma Postgres test resource.
 *
 * WHY: Prisma Postgres database URLs commonly end in `/postgres`, regardless of
 * the resource name shown in Prisma Console. Checking the URL path for the word
 * `test` therefore rejects valid test resources and offers no real protection.
 * This guard instead requires an exact test-only acknowledgement, a structurally
 * valid PostgreSQL URL, and a URL distinct from the application's configured
 * database. Each integration suite also requires an empty waypoint table before
 * it creates fixtures, providing a final fail-closed check before any deletion.
 */
export function requireSafeTestDatabaseUrl({
  applicationDatabaseUrl,
  confirmation,
  testDatabaseUrl,
}: TestDatabaseGuardInput): string {
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is not configured.");
  }
  if (confirmation !== EXPECTED_TEST_DATABASE_CONFIRMATION) {
    throw new Error(
      `TEST_DATABASE_CONFIRMATION must equal ${EXPECTED_TEST_DATABASE_CONFIRMATION}.`,
    );
  }
  if (applicationDatabaseUrl && testDatabaseUrl === applicationDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL must not equal DATABASE_URL.");
  }

  const parsed = new URL(testDatabaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("TEST_DATABASE_URL must be a direct PostgreSQL connection URL.");
  }
  if (!parsed.username || !parsed.password || !parsed.hostname) {
    throw new Error("TEST_DATABASE_URL must contain dedicated database credentials.");
  }

  return testDatabaseUrl;
}
