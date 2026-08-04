/** Protects resumable authentication flows from becoming open redirects. */
import assert from "node:assert/strict";
import test from "node:test";
import { getSafePostLoginPath } from "./get-safe-post-login-path";

test("allows an internal Fellowship invitation return path", () => {
  assert.equal(getSafePostLoginPath("/join/opaque-code"), "/join/opaque-code");
});

test("rejects external, protocol-relative, and unknown return paths", () => {
  assert.equal(getSafePostLoginPath("https://attacker.example/join/code"), "/game");
  assert.equal(getSafePostLoginPath("//attacker.example/join/code"), "/game");
  assert.equal(getSafePostLoginPath("/unknown/code"), "/game");
});
