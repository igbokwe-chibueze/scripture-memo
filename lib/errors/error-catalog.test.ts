/**
 * Fast structural checks for the version-controlled application error manual.
 * These tests require no database or environment variables and prevent duplicate
 * or malformed codes from reaching Sonner messages and administrator searches.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { ERROR_CATALOG } from "@/lib/errors/error-catalog";

test("error codes are unique and follow the documented domain format", () => {
  const codes = ERROR_CATALOG.map(({ code }) => code);
  assert.equal(new Set(codes).size, codes.length, "Every error condition needs one unique code.");
  // WHY: Prefixes belong to application domains and will expand as features are
  // implemented. The test enforces a stable shape without limiting the manual
  // to the initial Waypoint and Verse entries.
  for (const code of codes) assert.match(code, /^[A-Z]{2,5}-\d{3}$/);
});

test("every error reference contains usable administrator guidance", () => {
  for (const entry of ERROR_CATALOG) {
    assert.ok(entry.title.trim());
    assert.ok(entry.userMessage.trim());
    assert.ok(entry.explanation.trim());
    assert.ok(entry.commonCauses.length > 0);
    assert.ok(entry.examples.length > 0);
    assert.ok(entry.solutions.length > 0);
  }
});
