/**
 * Pure Beacon progression coverage.
 *
 * Run with `npm run test:beacon`. These checks require no database and prove
 * the permanent level curve, league boundaries, Saint Crown awards, and the
 * one global UTC week boundary used for fair competition.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  beaconLevelFromXp,
  beaconLevelStartXp,
  demotedLeague,
  promotedLeague,
  saintCrownAward,
} from "@/features/beacon/constants/beacon-progression";
import { getBeaconWeekWindow } from "@/features/beacon/lib/beacon-week";

test("Beacon levels follow the documented cumulative progression curve", () => {
  assert.equal(beaconLevelFromXp(0), 1);
  assert.equal(beaconLevelFromXp(249), 1);
  assert.equal(beaconLevelFromXp(250), 2);
  assert.equal(beaconLevelFromXp(beaconLevelStartXp(10)), 10);
});

test("league movement stops at Traveler and Saint", () => {
  assert.equal(demotedLeague("TRAVELER"), "TRAVELER");
  assert.equal(promotedLeague("TRAVELER"), "DISCIPLE");
  assert.equal(promotedLeague("SAINT"), "SAINT");
  assert.equal(demotedLeague("SAINT"), "SCRIBE");
});

test("Saint Crown rewards match the approved weekly prestige table", () => {
  assert.equal(saintCrownAward(1), 5);
  assert.equal(saintCrownAward(2), 3);
  assert.equal(saintCrownAward(3), 2);
  assert.equal(saintCrownAward(10), 1);
  assert.equal(saintCrownAward(11), 0);
});

test("the competition week is Monday UTC through the next Monday UTC", () => {
  const window = getBeaconWeekWindow(new Date("2026-08-09T23:59:59.000Z"));
  assert.equal(window.startsAt.toISOString(), "2026-08-03T00:00:00.000Z");
  assert.equal(window.endsAt.toISOString(), "2026-08-10T00:00:00.000Z");
});

test("Monday UTC begins a fresh week for every timezone", () => {
  const window = getBeaconWeekWindow(new Date("2026-08-10T00:00:00.000Z"));
  assert.equal(window.startsAt.toISOString(), "2026-08-10T00:00:00.000Z");
  assert.equal(window.endsAt.toISOString(), "2026-08-17T00:00:00.000Z");
});
