import assert from "node:assert/strict";
import test from "node:test";
import { assertLocalDatabaseUrl } from "@/features/dev-fixtures/lib/assert-local-database-url";

/** Verifies the guard accepts only direct loopback PostgreSQL connections. */
test("accepts loopback PostgreSQL URLs", () => {
  const url = "postgresql://postgres:postgres@localhost:51214/template1";
  assert.equal(assertLocalDatabaseUrl(url), url);
});

/** Protects hosted Prisma Postgres even when a developer invokes the wrong script. */
test("rejects hosted and Prisma proxy URLs", () => {
  assert.throws(
    () => assertLocalDatabaseUrl("postgresql://user:secret@db.prisma.io/postgres"),
    /not a loopback database/,
  );
  assert.throws(
    () => assertLocalDatabaseUrl("prisma+postgres://localhost:51213/?api_key=secret"),
    /direct PostgreSQL/,
  );
});

/** Missing and malformed configuration must fail before Prisma is constructed. */
test("rejects absent and malformed URLs", () => {
  assert.throws(() => assertLocalDatabaseUrl(undefined), /DATABASE_URL is required/);
  assert.throws(() => assertLocalDatabaseUrl("not-a-url"), /valid PostgreSQL URL/);
});
