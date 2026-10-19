/** Local ordering/search regressions: no database, session or rewards involved. */
import assert from "node:assert/strict";
import test from "node:test";
import { browseFellowshipMembers, getFellowshipJourneyTotals, type FellowshipMemberSort } from "./fellowship-members";
import type { FellowshipMemberRanking } from "../types/fellowship.types";

const base: FellowshipMemberRanking = {
  rank: 1,
  profilePublicId: null,
  displayName: "Zoe",
  avatarKey: "lion",
  avatarFrameKey: "default",
  countryCode: null,
  waypointsCompleted: 1,
  lifetimeBeaconPoints: 1000,
  joinedAt: new Date("2026-01-01T00:00:00Z"),
  isLeader: true,
  isCurrentUser: false,
};
const members = [
  base,
  {
    ...base,
    rank: 3,
    displayName: "Daniel",
    lifetimeBeaconPoints: 100,
    isLeader: false,
    joinedAt: new Date("2026-03-01T00:00:00Z"),
  },
  {
    ...base,
    rank: 2,
    displayName: "Amara",
    lifetimeBeaconPoints: 500,
    isLeader: false,
    isCurrentUser: true,
    joinedAt: new Date("2026-02-01T00:00:00Z"),
  },
];

test("collective lifetime totals use the full roster and handle an empty fellowship", () => {
  assert.deepEqual(getFellowshipJourneyTotals(members), {
    lifetimeBeaconPoints: 1600,
    waypointsCompleted: 3,
  });
  browseFellowshipMembers(members, { query: "Daniel", sort: "RANK_ASC", locale: "en" });
  assert.equal(getFellowshipJourneyTotals(members).lifetimeBeaconPoints, 1600);
  assert.deepEqual(getFellowshipJourneyTotals([]), {
    lifetimeBeaconPoints: 0,
    waypointsCompleted: 0,
  });
});

/** Keep comparison expectations explicit so reversed sort directions cannot silently swap. */
test("member sorts pin the leader only by default and support both directions", () => {
  const expected: Record<FellowshipMemberSort, string[]> = {
    LEADER_NAME: ["Zoe", "Amara", "Daniel"],
    NAME_ASC: ["Amara", "Daniel", "Zoe"],
    NAME_DESC: ["Zoe", "Daniel", "Amara"],
    JOINED_ASC: ["Zoe", "Amara", "Daniel"],
    JOINED_DESC: ["Daniel", "Amara", "Zoe"],
    RANK_ASC: ["Zoe", "Amara", "Daniel"],
    RANK_DESC: ["Daniel", "Amara", "Zoe"],
  };
  const before = JSON.stringify(members);
  for (const [sort, names] of Object.entries(expected)) {
    const result = browseFellowshipMembers(members, {
      query: "",
      sort: sort as FellowshipMemberSort,
      locale: "en",
    });
    assert.deepEqual(result.map((member) => member.displayName), names);
  }
  assert.equal(JSON.stringify(members), before);
});

test("member search combines with sorting, handles accents and preserves empty results", () => {
  const result = browseFellowshipMembers([{ ...base, displayName: "Ézé" }], {
    query: " EZE ", sort: "LEADER_NAME", locale: "fr",
  });
  assert.equal(result.length, 1);
  assert.equal(browseFellowshipMembers(members, { query: "missing", sort: "NAME_ASC", locale: "en" }).length, 0);
  assert.deepEqual(browseFellowshipMembers([], { query: "", sort: "NAME_ASC", locale: "en" }), []);
});
