import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateMapPosition,
  calculateMapPreviewScale,
  createDefaultMapPositions,
  formatMapPositions,
  formatMapPositionerConfiguration,
  isWaypointButtonClipped,
  normalizeMapPercentage,
  resizeMapPositions,
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

test("creates and resizes configurable waypoint layouts without losing retained work", () => {
  assert.equal(createDefaultMapPositions(5).length, 5);
  assert.deepEqual(
    resizeMapPositions(
      [
        { x: 11, y: 22 },
        { x: 33, y: 44 },
      ],
      3,
    ).slice(0, 2),
    [
      { x: 11, y: 22 },
      { x: 33, y: 44 },
    ],
  );
});

test("detects clipping using the configured rendered button diameter", () => {
  assert.equal(isWaypointButtonClipped({ x: 50, y: 50 }, 64, 375, 667), false);
  assert.equal(isWaypointButtonClipped({ x: 5, y: 50 }, 64, 375, 667), true);
});

test("fits image and waypoint controls with one non-enlarging scale", () => {
  assert.equal(calculateMapPreviewScale(375, 667, 375, 500), 500 / 667);
  assert.equal(calculateMapPreviewScale(375, 667, 800, 900), 1);
  assert.equal(calculateMapPreviewScale(0, 667, 375, 500), 1);
});

test("exports both responsive layouts and exact preview settings", () => {
  const output = formatMapPositionerConfiguration({
    image: { width: 941, height: 1672 },
    waypointCount: 1,
    breakpoint: 640,
    currentWaypoint: 1,
    mobile: {
      previewWidth: 375,
      buttonSize: 64,
      currentButtonSize: 72,
      positions: [{ x: 40, y: 50 }],
    },
    large: {
      previewWidth: 480,
      buttonSize: 80,
      currentButtonSize: 96,
      positions: [{ x: 45, y: 55 }],
    },
  });

  assert.match(output, /image: \{ width: 941, height: 1672 \}/);
  assert.match(output, /previewWidth: 375/);
  assert.match(output, /currentButtonSize: 96/);
  assert.match(output, /\{ x: 45, y: 55 \}/);
});
