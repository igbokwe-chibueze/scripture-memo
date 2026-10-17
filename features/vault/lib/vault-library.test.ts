/** Collection regression checks: no DB, credentials, or progress mutations.
 * These protect the distinction between Learn completion and full mastery,
 * and ensure overlapping sources never produce duplicate cards/counts.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { collectVaultVerses, getVaultStatus } from "./vault-library";
import type { VaultVerseItem } from "../types/vault.types";

const verse: VaultVerseItem = {
  verseId: "fixture",
  reference: "John 3:16",
  translation: "KJV",
  text: null,
  availableTranslations: ["KJV"],
  packSlugs: [],
  packNames: [],
  isFavorite: false,
  hasPersonalNote: false,
  studyAccess: "LOCKED",
  completedStages: [],
};

test("Learn earns Completed while every distinct stage earns Mastered", () => {
  assert.equal(getVaultStatus(verse), "inProgress");
  assert.equal(getVaultStatus({ ...verse, completedStages: ["RECALL"] }), "inProgress");
  assert.equal(getVaultStatus({ ...verse, completedStages: ["LEARN"] }), "completed");
  assert.equal(getVaultStatus({
    ...verse,
    completedStages: ["LEARN", "RECALL", "STRENGTHEN", "MASTER"],
  }), "mastered");
});

test("a favorite/completed overlap renders once and retains redacted text", () => {
  const items = collectVaultVerses({
    completedVerses: [verse],
    masteredVerses: [],
    favoriteVerses: [verse],
    inProgressVerses: [verse],
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].text, null);
});
