"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { InfoIcon, RotateCcwIcon, SearchIcon, AwardIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { Button } from "@/components/ui/button";
import { BadgeCollectionCard } from "./badge-collection-card";
import { BadgeCollectionSummary } from "./badge-collection-summary";
import {
  BADGE_CATEGORIES,
  BADGE_RARITIES,
  filterBadgeCollection,
  type BadgeStatusFilter,
} from "../lib/badge-collection";
import type { BadgeCollectionItem } from "../types/badge.types";
import type { BadgeCategory } from "@/lib/generated/prisma/enums";
import styles from "./badge-collection.module.css";

/** Filters the same authorized payload locally, without reads or reward writes.
 * Rarity groups replace the old rarity selector/desktop card-selection overlay.
 */
export function BadgeCollection({
  badges,
}: {
  badges: BadgeCollectionItem[];
}): React.ReactNode {
  const t = useTranslations("Badges");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<BadgeCategory | "ALL">("ALL");
  const [status, setStatus] = useState<BadgeStatusFilter>("ALL");
  const visible = filterBadgeCollection(badges, { query, category, status });
  const filtered = Boolean(query.trim()) || category !== "ALL" || status !== "ALL";

  /** Resets all local controls without refreshing or changing stored progress. */
  const clearFilters = (): void => {
    setQuery("");
    setCategory("ALL");
    setStatus("ALL");
  };

  return (
    <GamePageColumns contextPanel={<BadgeCollectionSummary badges={badges} />}>
      <div className={styles.controls}>
        <label className={styles.search}>
          <SearchIcon className="size-5" aria-hidden="true" />
          <span className="sr-only">{t("searchBadges")}</span>
          <input
            type="search"
            value={query}
            placeholder={t("searchBadges")}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">{t("category")}</span>
          <select
            value={category}
            onChange={(event) => setCategory(
              BADGE_CATEGORIES.find((value) => value === event.target.value) ?? "ALL",
            )}
          >
            <option value="ALL">{t("category")}: {t("allOption")}</option>
            {BADGE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {t("category")}: {t("categoryNames." + value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{t("statusLabel")}</span>
          <select
            value={status}
            onChange={(event) => setStatus(
              (["ALL", "COMPLETED", "IN_PROGRESS", "LOCKED"] as const)
                .find((value) => value === event.target.value) ?? "ALL",
            )}
          >
            <option value="ALL">{t("statusLabel")}: {t("allOption")}</option>
            {(["COMPLETED", "IN_PROGRESS", "LOCKED"] as const).map((value) => (
              <option key={value} value={value}>
                {t("statusLabel")}: {t("statusNames." + value)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={styles.guidance}>
        <InfoIcon className="size-5 shrink-0" aria-hidden="true" />
        {t("earningGuidance")}
      </p>
      <p className="sr-only" aria-live="polite">
        {t("resultCount", { count: visible.length })}
      </p>
      {visible.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={<AwardIcon />}
          title={badges.length === 0 ? t("empty") : t("noMatch")}
          description={badges.length === 0 ? t("emptyCollectionDescription") : t("clearPrompt")}
          action={filtered ? (
            <Button variant="secondary" className="min-h-11 px-4" onClick={clearFilters}>
              <RotateCcwIcon aria-hidden="true" />
              {t("clearFilters")}
            </Button>
          ) : undefined}
        />
      ) : (
        <div className={styles.groups}>
          {BADGE_RARITIES.map((rarity) => {
            const group = visible.filter((badge) => badge.rarity === rarity);
            if (group.length === 0) return null;
            const earned = group.filter((badge) => badge.status === "COMPLETED").length;
            return (
              <section key={rarity} aria-labelledby={"badge-group-" + rarity}>
                <header className={styles.groupHeading} data-rarity={rarity}>
                  <span className={styles.rarityDot} aria-hidden="true" />
                  <h2 id={"badge-group-" + rarity} className="font-heading text-xl font-bold">
                    {t("rarityNames." + rarity)}
                  </h2>
                  <p>{t("groupCount", { earned, total: group.length })}</p>
                </header>
                <div className={styles.grid}>
                  {group.map((badge) => (
                    <BadgeCollectionCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </GamePageColumns>
  );
}
