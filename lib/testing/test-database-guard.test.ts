/** Regression tests run without opening a database connection. */
import assert from "node:assert/strict";
import test from "node:test";
import { requireSafeTestDatabaseUrl } from "./test-database-guard";

const configuration = {
  applicationDatabaseUrl: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
  testDatabaseUrl: "postgres://postgres:postgres@localhost:51224/template1?sslmode=disable",
  confirmation: "scripture-memo-integration-tests",
};

test("accepts a confirmed separate local listener", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
    const testDatabaseUrl = configuration.testDatabaseUrl.replace("localhost", host);
    assert.equal(requireSafeTestDatabaseUrl({ ...configuration, testDatabaseUrl }), testDatabaseUrl);
  }
});

test("rejects same listener despite path, credentials, schema, and alias changes", () => {
  for (const testDatabaseUrl of [
    configuration.applicationDatabaseUrl,
    "postgresql://other:secret@127.0.0.1:51214/test?schema=test",
    "postgres://postgres:postgres@[::1]:51214/another",
  ]) {
    assert.throws(() => requireSafeTestDatabaseUrl({ ...configuration, testDatabaseUrl }), /different local port/);
  }
  assert.throws(() => requireSafeTestDatabaseUrl({
    ...configuration,
    applicationDatabaseUrl: "postgres://a:b@localhost/app",
    testDatabaseUrl: "postgres://c:d@127.0.0.1:5432/test",
  }), /different local port/);
});

test("rejects missing settings, hosted connections, and host overrides", () => {
  for (const overrides of [
    { confirmation: undefined },
    { applicationDatabaseUrl: undefined },
    { testDatabaseUrl: undefined },
    { testDatabaseUrl: "invalid" },
    { testDatabaseUrl: "postgres://a:b@db.prisma.io/test" },
    { applicationDatabaseUrl: "postgres://a:b@db.prisma.io/app" },
    { testDatabaseUrl: "prisma+postgres://localhost:51224/test" },
    { testDatabaseUrl: "postgres://localhost:51224/test" },
    { testDatabaseUrl: configuration.testDatabaseUrl + "&host=remote.example" },
  ]) {
    assert.throws(() => requireSafeTestDatabaseUrl({ ...configuration, ...overrides }));
  }
});

test("rejects production", () => {
  const previous = process.env.NODE_ENV;
  try {
    Reflect.set(process.env, "NODE_ENV", "production");
    assert.throws(() => requireSafeTestDatabaseUrl(configuration), /disabled in production/);
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
    } else {
      Reflect.set(process.env, "NODE_ENV", previous);
    }
  }
});
