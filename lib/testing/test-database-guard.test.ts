/** Unit coverage for the fail-closed integration database safety boundary. */
import assert from "node:assert/strict";
import test from "node:test";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testUrl = "postgresql://test-user:test-password@db.prisma.io:5432/postgres";

test("accepts a distinct confirmed Prisma Postgres test resource URL", () => {
  assert.equal(
    requireSafeTestDatabaseUrl({
      applicationDatabaseUrl: "prisma+postgres://accelerate.prisma-data.net/?api_key=development",
      confirmation: "scripture-memo-integration-tests",
      testDatabaseUrl: testUrl,
    }),
    testUrl,
  );
});

test("rejects missing confirmation and reuse of the application database URL", () => {
  assert.throws(
    () => requireSafeTestDatabaseUrl({
      applicationDatabaseUrl: "postgresql://development:secret@db.prisma.io/postgres",
      confirmation: undefined,
      testDatabaseUrl: testUrl,
    }),
    /TEST_DATABASE_CONFIRMATION/,
  );
  assert.throws(
    () => requireSafeTestDatabaseUrl({
      applicationDatabaseUrl: testUrl,
      confirmation: "scripture-memo-integration-tests",
      testDatabaseUrl: testUrl,
    }),
    /must not equal DATABASE_URL/,
  );
});

