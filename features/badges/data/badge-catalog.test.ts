import assert from "node:assert/strict";
import test from "node:test";
import { BADGE_CATALOG } from "@/features/badges/data/badge-catalog";
import { isBadgeCriterionAvailable } from "@/features/badges/constants/badge-criteria";
import { createBadgeSlug } from "@/features/badges/lib/badge-slug";

const EXPECTED_REWARDS = {
  COMMON: 50,
  UNCOMMON: 100,
  RARE: 200,
  EPIC: 350,
  LEGENDARY: 500,
} as const;

test("badge catalogue keeps unique stable identifiers", () => {
  assert.equal(new Set(BADGE_CATALOG.map(({ slug }) => slug)).size, BADGE_CATALOG.length);
  assert.equal(new Set(BADGE_CATALOG.map(({ name }) => name)).size, BADGE_CATALOG.length);
});

test("every badge receives the approved rarity reward", () => {
  BADGE_CATALOG.forEach((badge) => {
    assert.equal(badge.rewardAmount, EXPECTED_REWARDS[badge.rarity]);
  });
});

test("streak badges match the approved level milestones", () => {
  const streakTargets = BADGE_CATALOG
    .filter(({ criteriaKey }) => criteriaKey === "STREAK_DAYS")
    .map(({ name, targetValue }) => [name, targetValue]);
  assert.deepEqual(streakTargets, [
    ["Spark", 1],
    ["Kindling", 3],
    ["Steady Flame", 7],
    ["Beacon", 14],
    ["Blaze", 30],
    ["Inferno", 60],
    ["Supernova", 100],
    ["Eternal Light", 365],
  ]);
});

test("badge descriptions do not use the prohibited game-mode term", () => {
  BADGE_CATALOG.forEach(({ description }) => {
    assert.doesNotMatch(description, /\bhint\b/i);
  });
});

test("future-feature catalogue badges are seeded as paused", () => {
  BADGE_CATALOG.forEach((badge) => {
    if (!isBadgeCriterionAvailable(badge.criteriaKey)) {
      assert.equal(badge.isActive, false);
    }
  });
});

test("Vault Explorer activates with the trusted Phase 23 replay metric", () => {
  const vaultExplorer = BADGE_CATALOG.find(({ slug }) => slug === "vault-explorer");
  assert.ok(vaultExplorer);
  assert.equal(isBadgeCriterionAvailable(vaultExplorer.criteriaKey), true);
  assert.notEqual(vaultExplorer.isActive, false);
});

test("administrator badge names produce stable safe slugs", () => {
  assert.equal(createBadgeSlug("  Keeper's Light!  "), "keeper-s-light");
  assert.equal(createBadgeSlug("Éternal   Flame"), "eternal-flame");
});
