/** Read-only regressions for collection browsing; earning rules stay server-owned. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  filterBadgeCollection,
  getBadgeProgressPercent,
  getBadgeDisplayStatus,
  getBadgeRarityCounts,
} from "./badge-collection";
import type { BadgeCollectionItem } from "../types/badge.types";

const badge: BadgeCollectionItem = {
  id: "sample",
  name: "First Steps",
  slug: "first-steps",
  description: "Complete your first Learn stage.",
  icon: "🌱",
  category: "LEARNING",
  rarity: "COMMON",
  targetValue: 1,
  rewardAmount: 25,
  isHidden: false,
  isActive: true,
  progress: 1,
  status: "COMPLETED",
  unlockedAt: null,
};
const badges: BadgeCollectionItem[] = [
  badge,
  {
    ...badge,
    id: "streak",
    name: "Steady Flame",
    description: "Maintain a seven-day streak.",
    category: "STREAK",
    rarity: "UNCOMMON",
    progress: 4,
    targetValue: 7,
    status: "IN_PROGRESS",
  },
  {
    ...badge,
    id: "secret",
    name: "Secret Badge",
    slug: "secret-sample",
    description: "Unlock this achievement to discover it.",
    icon: null,
    rarity: "EPIC",
    isHidden: true,
    progress: 0,
    status: "NOT_STARTED",
  },
];

/** Covers historical zero-count rows as well as the first qualifying achievement. */
test("zero progress is locked and positive progress is in progress until earned", () => {
  const unearned: BadgeCollectionItem = {
    ...badge,
    targetValue: 50,
    status: "IN_PROGRESS",
    progress: 0,
  };

  assert.equal(getBadgeDisplayStatus(unearned), "LOCKED");
  assert.equal(getBadgeDisplayStatus({ ...unearned, progress: 1 }), "IN_PROGRESS");
  assert.equal(getBadgeDisplayStatus({ ...unearned, progress: 49 }), "IN_PROGRESS");
  assert.equal(getBadgeDisplayStatus({
    ...unearned,
    progress: 50,
    status: "COMPLETED",
  }), "COMPLETED");
  // Historical zero-count rows must also move into the correct filter bucket.
  assert.equal(filterBadgeCollection([unearned], {
    query: "",
    category: "ALL",
    status: "LOCKED",
  }).length, 1);
  assert.equal(filterBadgeCollection([unearned], {
    query: "",
    category: "ALL",
    status: "IN_PROGRESS",
  }).length, 0);
});

test("search/category/status combine without changing progress or secret identity", () => {
  const before = JSON.stringify(badges);
  assert.deepEqual(filterBadgeCollection(badges, {
    query: "  STEADY  ", category: "STREAK", status: "IN_PROGRESS",
  }).map((item) => item.id), ["streak"]);
  assert.equal(filterBadgeCollection(badges, {
    query: "First", category: "STREAK", status: "ALL",
  }).length, 0);
  assert.deepEqual(filterBadgeCollection(badges, {
    query: "", category: "ALL", status: "LOCKED",
  }).map((item) => item.name), ["Secret Badge"]);
  assert.equal(JSON.stringify(badges), before);
});

test("rarity totals count earned badges once and handle an empty collection", () => {
  const counts = getBadgeRarityCounts(badges);
  assert.equal(counts.reduce((sum, item) => sum + item.total, 0), 3);
  assert.equal(counts.reduce((sum, item) => sum + item.earned, 0), 1);
  assert.ok(getBadgeRarityCounts([]).every((item) => item.total === 0 && item.earned === 0));
  assert.equal(getBadgeProgressPercent(15, 10), 100);
  assert.equal(getBadgeProgressPercent(-1, 10), 0);
  assert.equal(getBadgeProgressPercent(0, 0), 0);
});
