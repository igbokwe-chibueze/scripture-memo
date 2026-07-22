import assert from "node:assert/strict";
import test from "node:test";
import { getMapTheme, MAP_THEMES } from "@/features/map/data/map-themes";

/**
 * Configuration checks prevent missing or out-of-bounds responsive centers from
 * making a waypoint inaccessible. They inspect metadata only and never load an
 * image or access either application database.
 */
test("every map defines five in-bounds positions for both responsive layouts", () => {
  for (const theme of MAP_THEMES) {
    assert.equal(theme.mobilePositions.length, 5);
    assert.equal(theme.largePositions.length, 5);
    assert.equal(theme.imageSrc.startsWith("/images/maps/"), true);

    for (const position of [...theme.mobilePositions, ...theme.largePositions]) {
      assert.equal(position.x >= 0 && position.x <= 100, true);
      assert.equal(position.y >= 0 && position.y <= 100, true);
    }
  }
});

test("every trail theme uses the owner-approved positions at both breakpoints", () => {
  const approvedPositions = [
    { x: 50, y: 10 },
    { x: 35, y: 30 },
    { x: 65, y: 50 },
    { x: 40, y: 70 },
    { x: 60, y: 90 },
  ];

  // WHY: New artwork inherits one stable trail rhythm by default. This exact
  // assertion prevents future themes from introducing per-image coordinates
  // without making that product decision visible in review.
  for (const theme of MAP_THEMES) {
    assert.deepEqual(theme.mobilePositions, approvedPositions);
    assert.deepEqual(theme.largePositions, approvedPositions);
  }
});

test("five-waypoint map themes repeat indefinitely in artwork order", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 300].map((index) => getMapTheme(index).id),
    ["coastal", "desert", "temple", "coastal", "desert", "temple", "coastal"],
  );
});
