/**
 * Verifies that local reliability settings never leak into hosted database
 * pools, where normal concurrency must remain available in production.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { getPostgresPoolConfig } from "./get-postgres-pool-config";

test("serializes connections only for loopback PostgreSQL databases", () => {
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
});

test("preserves the default driver pool size for hosted databases", () => {
  const config = getPostgresPoolConfig(
    "postgresql://app:secret@database.example.com:5432/scripture?sslmode=verify-full",
  );

  assert.equal(config.max, undefined);
  assert.match(config.connectionString ?? "", /database\.example\.com/);
});
