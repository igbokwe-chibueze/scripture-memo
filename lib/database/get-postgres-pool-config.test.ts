/**
 * Verifies that local reliability settings never leak into hosted database
 * pools, where normal concurrency must remain available in production.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { getPostgresPoolConfig } from "./get-postgres-pool-config";

test("serializes connections only for the project's Prisma Local instances", () => {
  assert.equal(
    getPostgresPoolConfig(
      "postgresql://postgres:postgres@localhost:51214/template1?sslmode=disable",
    ).max,
    1,
  );
  assert.equal(
    getPostgresPoolConfig(
      "postgresql://postgres:postgres@127.0.0.1:51214/template1?sslmode=disable",
    ).max,
    1,
  );
  assert.equal(
    getPostgresPoolConfig(
      "postgresql://postgres:postgres@localhost:51224/template1?sslmode=disable",
    ).max,
    1,
  );
});

test("allows multi-connection pools for other local PostgreSQL servers", () => {
  for (const connectionString of [
    "postgresql://postgres:postgres@localhost:5433/scripture_test?sslmode=disable",
    "postgresql://postgres:postgres@127.0.0.1:55432/scripture_test?sslmode=disable",
  ]) {
    assert.equal(
      getPostgresPoolConfig(connectionString).max,
      undefined,
      "Native local PostgreSQL should use the normal multi-connection pool.",
    );
  }
});

test("preserves the default driver pool size for hosted databases", () => {
  const config = getPostgresPoolConfig(
    "postgresql://app:secret@database.example.com:5432/scripture?sslmode=verify-full",
  );

  assert.equal(config.max, undefined);
  assert.match(config.connectionString ?? "", /database\.example\.com/);
});
