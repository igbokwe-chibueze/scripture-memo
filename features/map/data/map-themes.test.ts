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

test("five-waypoint map themes repeat indefinitely in artwork order", () => {
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5, 300].map((index) => getMapTheme(index).id),
    ["coastal", "desert", "temple", "coastal", "desert", "temple", "coastal"],
  );
});
