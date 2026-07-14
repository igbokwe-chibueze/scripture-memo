import assert from "node:assert/strict";
import test from "node:test";
import { parseMapVariant, resolveMapVariant } from "@/features/map/lib/map-variant";

/**
 * Pure unit coverage for browser-owned experiment preference rules. The policy
 * uses plain strings, so no browser, account, or database is involved.
 */
test("accepts only the two supported map variant identifiers", () => {
  // Reject descriptive/stale values so tester links remain deterministic.
  assert.equal(parseMapVariant("a"), "a");
  assert.equal(parseMapVariant("b"), "b");
  assert.equal(parseMapVariant("trail"), null);
  assert.equal(parseMapVariant(null), null);
});

test("prefers a valid tester URL assignment over stored preference", () => {
  // URL precedence supports assigned tests; invalid URLs fall back to stored
  // preference and then stable Map A for a first-time visitor.
  assert.equal(resolveMapVariant("b", "a"), "b");
  assert.equal(resolveMapVariant("invalid", "b"), "b");
  assert.equal(resolveMapVariant(undefined, undefined), "a");
});
