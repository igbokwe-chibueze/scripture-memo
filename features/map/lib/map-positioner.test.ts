import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMapPosition,
  formatMapPositions,
  normalizeMapPercentage,
} from "@/features/map/lib/map-positioner";

/**
 * Pure coverage for the development tool's coordinate contract. No browser,
 * filesystem, application database, or test database is accessed by this suite.
 */
test("normalizes percentages to the image boundary with two-decimal precision", () => {
  assert.equal(normalizeMapPercentage(-2), 0);
  assert.equal(normalizeMapPercentage(101), 100);
  assert.equal(normalizeMapPercentage(33.3333), 33.33);
  assert.equal(normalizeMapPercentage(Number.NaN), 0);
});

test("converts rendered pointer coordinates into reusable image percentages", () => {
  const position = calculateMapPosition(300, 600, {
    left: 100,
    top: 100,
    width: 400,
    height: 1_000,
  });

  assert.deepEqual(position, { x: 50, y: 50 });
});

test("formats normalized coordinates as paste-ready TypeScript", () => {
  assert.equal(
    formatMapPositions([
      { x: 25.555, y: -1 },
      { x: 110, y: 75 },
    ]),
    "[\n  { x: 25.56, y: 0 },\n  { x: 100, y: 75 },\n] as const",
  );
});
