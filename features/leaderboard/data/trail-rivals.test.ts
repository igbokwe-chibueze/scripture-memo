import assert from "node:assert/strict";
import test from "node:test";
import { BeaconLeague } from "@/lib/generated/prisma/enums";
import {
  calculateRivalWeeklyXp,
  createTrailRivals,
} from "@/features/leaderboard/data/trail-rivals";

test("rival scores are stable at the same simulated moment", () => {
  const input = {
    seed: "viewer-week-rival",
    weekStartsAt: new Date("2026-08-03T00:00:00.000Z"),
    now: new Date("2026-08-05T14:00:00.000Z"),
    league: BeaconLeague.TRAVELER,
  };
  assert.equal(calculateRivalWeeklyXp(input), calculateRivalWeeklyXp(input));
});

test("rivals fill only league and country display rows without official ranks", () => {
  const rivals = createTrailRivals({
    viewerId: "learner-1",
    scope: "country",
    countryCode: "NG",
    league: BeaconLeague.TRAVELER,
    weekStartsAt: new Date("2026-08-03T00:00:00.000Z"),
    now: new Date("2026-08-05T14:00:00.000Z"),
    realVisibleCount: 2,
  });
  assert.equal(rivals.length, 13);
  assert.ok(rivals.every((rival) => rival.rank === null));
  assert.ok(rivals.every((rival) => rival.countryCode === "NG"));
  assert.equal(
    new Set(rivals.map((rival) => rival.displayName)).size,
    rivals.length,
  );
});
