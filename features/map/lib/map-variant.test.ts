import assert from "node:assert/strict";
import test from "node:test";
import { parseMapVariant, resolveMapVariant } from "@/features/map/lib/map-variant";

test("accepts only the two supported map variant identifiers", () => {
  assert.equal(parseMapVariant("a"), "a");
  assert.equal(parseMapVariant("b"), "b");
  assert.equal(parseMapVariant("trail"), null);
  assert.equal(parseMapVariant(null), null);
});

test("prefers a valid tester URL assignment over stored preference", () => {
  assert.equal(resolveMapVariant("b", "a"), "b");
  assert.equal(resolveMapVariant("invalid", "b"), "b");
  assert.equal(resolveMapVariant(undefined, undefined), "a");
});
