/**
 * Checks that only a well-formed token payload can guide the server's active
 * link lookup. These tests intentionally do not verify signatures; Better Auth
 * owns signature validation, and the matching keyed database digest is also
 * required before its verification endpoint is called.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { getVerificationTokenEmail } from "./email-verification-token";

function createTestToken(payload: unknown): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encodedPayload}.signature`;
}

test("returns the normalized email claim from a structurally valid token", () => {
  assert.equal(
    getVerificationTokenEmail(
      createTestToken({ email: "Learner@Example.Test", exp: 1_800_000_000 }),
    ),
    "learner@example.test",
  );
});

test("rejects malformed tokens and payloads without a valid email", () => {
  assert.equal(getVerificationTokenEmail("not-a-token"), null);
  assert.equal(getVerificationTokenEmail("header..signature"), null);
  assert.equal(
    getVerificationTokenEmail(createTestToken({ email: "not-an-email" })),
    null,
  );
});
