import type { VaultLibraryData, VaultVerseItem } from "../types/vault.types";
import { hasCompletedEveryJourneyStage } from "./vault-mastery";

/** Fixed display states; completion is earned at Learn, mastery at all stages. */
export type VaultStatus = "inProgress" | "completed" | "mastered";

/** A later active waypoint does not erase a verse's previously earned status. */
export function getVaultStatus(verse: VaultVerseItem): VaultStatus {
  if (hasCompletedEveryJourneyStage(new Set(verse.completedStages))) {
    return "mastered";
  }
  return verse.completedStages.includes("LEARN") ? "completed" : "inProgress";
}

/** Deduplicates the three authorized sources without duplicating mastered cards. */
export function collectVaultVerses(data: VaultLibraryData): VaultVerseItem[] {
  const verses = new Map<string, VaultVerseItem>();
  for (const verse of [
    ...data.favoriteVerses,
    ...data.completedVerses,
    ...data.inProgressVerses,
  ]) {
    verses.set(verse.verseId, verse);
  }
  return [...verses.values()].sort((a, b) => a.reference.localeCompare(b.reference));
}
