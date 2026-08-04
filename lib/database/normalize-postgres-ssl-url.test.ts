import assert from "node:assert/strict";
import test from "node:test";
import { normalizePostgresSslUrl } from "./normalize-postgres-ssl-url";

/** The three currently aliased modes must retain strict pg verification. */
test("ambiguous SSL modes become verify-full", () => {
  for (const sslMode of ["prefer", "require", "verify-ca"]) {
    const result = normalizePostgresSslUrl(
      `postgresql://user:secret@database.example/app?sslmode=${sslMode}`,
    );

    assert.equal(new URL(result).searchParams.get("sslmode"), "verify-full");
  }
});

/** Explicit secure and compatibility choices must remain untouched. */
test("explicit SSL behavior is preserved", () => {
  const secureUrl =
    "postgresql://user:secret@database.example/app?sslmode=verify-full";
  const compatibilityUrl =
    "postgresql://user:secret@database.example/app?uselibpqcompat=true&sslmode=require";

  assert.equal(normalizePostgresSslUrl(secureUrl), secureUrl);
  assert.equal(normalizePostgresSslUrl(compatibilityUrl), compatibilityUrl);
});

/** Configuration failures must not echo credentials into server logs. */
test("invalid URL errors do not expose their input", () => {
  const secretInput = "not-a-url-with-secret-password";

  assert.throws(
    () => normalizePostgresSslUrl(secretInput),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(secretInput), false);
      return true;
    },
  );
});
