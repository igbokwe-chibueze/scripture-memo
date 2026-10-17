import type { BadgeCollectionItem } from "../types/badge.types";
import type { BadgeCategory, BadgeRarity } from "@/lib/generated/prisma/enums";

/** Fixed display ordering only; badge criteria/rewards remain server-owned. */
export const BADGE_RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] as const;
export const BADGE_CATEGORIES = [
  "LEARNING", "STREAK", "MASTERY", "INDEPENDENCE", "SPEED", "EXPLORATION",
] as const;
export type BadgeStatusFilter = "ALL" | "COMPLETED" | "IN_PROGRESS" | "LOCKED";

/** Matches existing progress states; Locked means not started, not a prerequisite. */
export function getBadgeDisplayStatus(
  badge: BadgeCollectionItem,
): Exclude<BadgeStatusFilter, "ALL"> {
  if (badge.status === "COMPLETED") return "COMPLETED";
  return badge.status === "IN_PROGRESS" ? "IN_PROGRESS" : "LOCKED";
}

/** Searches only the already-authorized/redacted payload; no additional reads. */
export function filterBadgeCollection(
  badges: readonly BadgeCollectionItem[],
  filters: {
    query: string;
    category: BadgeCategory | "ALL";
    status: BadgeStatusFilter;
  },
): BadgeCollectionItem[] {
  const query = filters.query.trim().normalize("NFKC").toLowerCase();
  return badges.filter((badge) => {
    if (filters.category !== "ALL" && badge.category !== filters.category) return false;
    if (filters.status !== "ALL" && getBadgeDisplayStatus(badge) !== filters.status) return false;
    return `${badge.name} ${badge.description}`.normalize("NFKC").toLowerCase().includes(query);
  });
}

/** Counts the full collection independently of local search/filter changes. */
export function getBadgeRarityCounts(
  badges: readonly BadgeCollectionItem[],
): Array<{ rarity: BadgeRarity; total: number; earned: number }> {
  return BADGE_RARITIES.map((rarity) => {
    const group = badges.filter((badge) => badge.rarity === rarity);
    return {
      rarity,
      total: group.length,
      earned: group.filter((badge) => badge.status === "COMPLETED").length,
    };
  });
}

/** Protects visual progress from zero targets and out-of-range historic values. */
export function getBadgeProgressPercent(progress: number, target: number): number {
  return Math.max(0, Math.min(100, progress / Math.max(1, target) * 100));
}
