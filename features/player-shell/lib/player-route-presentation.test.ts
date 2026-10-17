/** Routing regressions use synthetic paths only; no app or database is needed. */
import assert from "node:assert/strict";
import test from "node:test";
import { getPlayerSection, isPlayerNavigationActive } from "./player-route-presentation";

test("Sanctuary owns its header and never selects the Vault destination", () => {
  for (const pathname of ["/sanctuary", "/sanctuary/sample-verse"]) {
    assert.equal(getPlayerSection(pathname)?.key, "sanctuary");
    assert.equal(getPlayerSection(pathname)?.artwork, "bibleOpen");
    assert.equal(isPlayerNavigationActive(pathname, "/vault", false), false);
  }
});

test("Vault children and waypoint Map links retain their intended selection", () => {
  assert.equal(getPlayerSection("/vault/badges")?.key, "badgeCollection");
  assert.equal(getPlayerSection("/vault/badges")?.artwork, "badges");
  assert.equal(isPlayerNavigationActive("/vault/badges", "/vault", false), true);
  assert.equal(isPlayerNavigationActive("/game/waypoints/example", "/game/map", false), true);
  assert.equal(isPlayerNavigationActive("/game/map", "/game", true), false);
  assert.equal(isPlayerNavigationActive("/vaulted", "/vault", false), false);
});
