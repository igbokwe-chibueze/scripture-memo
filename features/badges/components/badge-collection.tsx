"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckIcon, HelpCircleIcon, LockIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";
import { ContextPanelCard } from "@/components/shared/context-panel-card";
import { EmptyState } from "@/components/shared/empty-state";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { Button } from "@/components/ui/button";
import type { BadgeCollectionItem } from "@/features/badges/types/badge.types";
import type { BadgeCategory, BadgeRarity } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type CollectionFilter = "ALL" | "COMPLETED" | "IN_PROGRESS" | "LOCKED";

const RARITY_RING = {
  COMMON: "border-border dark:border-border",
  UNCOMMON: "border-success-border",
  RARE: "border-info-border",
  EPIC: "border-selection-border",
  LEGENDARY: "border-reward-border shadow-reward/20",
} as const;

/**
 * Picks an immediately useful default detail without another database read.
 * Active progress is actionable; otherwise show the newest earned badge, then
 * the first available catalog entry for a learner who has no progress yet.
 */
function getInitialBadgeSelection(
  badges: BadgeCollectionItem[],
): BadgeCollectionItem | null {
  const inProgress = badges.find((badge) => badge.status === "IN_PROGRESS");
  if (inProgress) return inProgress;

  const recentlyEarned = badges
    .filter((badge) => badge.status === "COMPLETED")
    .sort((first, second) => {
      const firstTime = first.unlockedAt?.getTime() ?? 0;
      const secondTime = second.unlockedAt?.getTime() ?? 0;
      return secondTime - firstTime;
    })[0];

  return recentlyEarned ?? badges[0] ?? null;
}

/** Filters the complete player collection without obscuring live progress. */
export function BadgeCollection({
  badges,
}: {
  badges: BadgeCollectionItem[];
}): React.ReactNode {
  const t = useTranslations("Badges");
  const locale = useLocale();
  const [filter, setFilter] = useState<CollectionFilter>("ALL");
  const [category, setCategory] = useState<BadgeCategory | "ALL">("ALL");
  const [rarity, setRarity] = useState<BadgeRarity | "ALL">("ALL");
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(() =>
    getInitialBadgeSelection(badges)?.id ?? null,
  );
  const selectedBadge =
    badges.find((badge) => badge.id === selectedBadgeId) ?? null;
  const visibleBadges = useMemo(
    () =>
      badges.filter((badge) => {
        if (category !== "ALL" && badge.category !== category) return false;
        if (rarity !== "ALL" && badge.rarity !== rarity) return false;
        if (filter === "ALL") return true;
        if (filter === "COMPLETED") return badge.status === "COMPLETED";
        if (filter === "IN_PROGRESS") return badge.status === "IN_PROGRESS";
        return badge.status === "NOT_STARTED";
      }),
    [badges, category, filter, rarity],
  );
  const clearFilters = (): void => {
    setFilter("ALL");
    setCategory("ALL");
    setRarity("ALL");
  };

  const selectedIsSecret = Boolean(
    selectedBadge?.isHidden && selectedBadge.status !== "COMPLETED",
  );
  const selectedTitle = selectedBadge
    ? selectedIsSecret
      ? t("secretBadge")
      : selectedBadge.name
    : "";
  const selectedDescription = selectedBadge
    ? selectedIsSecret
      ? t("secretDescription")
      : selectedBadge.description
    : "";
  const contextPanel = selectedBadge ? (
    <ContextPanelCard
      icon={
        selectedIsSecret || !selectedBadge.icon ? (
          <SparklesIcon aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{selectedBadge.icon}</span>
        )
      }
      eyebrow={t("selectedAchievement")}
      title={selectedTitle}
      description={selectedDescription}
      detail={
        <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
          <span>
            {t("badgeProgress", {
              current: selectedBadge.progress,
              target: selectedBadge.targetValue,
            })}
          </span>
          <span>
            {selectedBadge.status === "COMPLETED"
              ? t("earned")
              : t("rewardShort", { points: selectedBadge.rewardAmount })}
          </span>
        </div>
      }
    />
  ) : null;

  return (
    <GamePageColumns contextPanel={contextPanel} className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-2" aria-label={t("statusFilters")}>
        {(["ALL", "COMPLETED", "IN_PROGRESS", "LOCKED"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-xs font-bold tracking-wide",
              filter === option
                ? "border-reward-border bg-reward text-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {t(`filters.${option}`)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <label className="grid gap-1 text-xs font-bold tracking-wide uppercase max-[340px]:min-w-0">
          {t("category")}
          <select
            id="badge-category-filter"
            name="badgeCategory"
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium normal-case max-[340px]:w-full max-[340px]:min-w-0 max-[340px]:px-2 max-[340px]:text-[0.8rem]"
            value={category}
            onChange={(event) => setCategory(event.currentTarget.value as BadgeCategory | "ALL")}
          >
            <option value="ALL">{t("allCategories")}</option>
            {["LEARNING", "STREAK", "MASTERY", "INDEPENDENCE", "SPEED", "EXPLORATION"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold tracking-wide uppercase max-[340px]:min-w-0">
          {t("rarity")}
          <select
            id="badge-rarity-filter"
            name="badgeRarity"
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium normal-case max-[340px]:w-full max-[340px]:min-w-0 max-[340px]:px-2 max-[340px]:text-[0.8rem]"
            value={rarity}
            onChange={(event) => setRarity(event.currentTarget.value as BadgeRarity | "ALL")}
          >
            <option value="ALL">{t("allRarities")}</option>
            {["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>

      {visibleBadges.length === 0 ? (
        <EmptyState
          variant="compact"
          icon={<SparklesIcon />}
          title={t("noMatch")}
          description={t("clearPrompt")}
          action={
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              <RotateCcwIcon aria-hidden="true" />
              {t("clearFilters")}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {visibleBadges.map((badge) => {
            const unlocked = badge.status === "COMPLETED";
            const secret = badge.isHidden && !unlocked;
            const selected = badge.id === selectedBadge?.id;
            const progressPercent = Math.min(
              100,
              Math.round((badge.progress / badge.targetValue) * 100),
            );
            return (
              <article
                key={badge.id}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-3xl border-2 bg-card p-2 pb-3 text-left shadow-sm transition-[border-color,box-shadow] max-[340px]:aspect-auto max-[340px]:min-h-[11.5rem] sm:aspect-auto sm:p-5 xl:cursor-pointer",
                  RARITY_RING[badge.rarity],
                  unlocked && badge.rarity === "LEGENDARY" && "shadow-xl",
                  selected && "xl:border-primary xl:ring-2 xl:ring-primary/25",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  aria-label={t("selectAchievement", {
                    name: secret ? t("secretBadge") : badge.name,
                  })}
                  onClick={() => setSelectedBadgeId(badge.id)}
                  className="absolute inset-0 z-10 hidden rounded-[inherit] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none xl:block"
                />
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <span className="grid size-8 place-items-center rounded-2xl bg-muted text-lg sm:size-16 sm:text-3xl">
                    {secret ? <HelpCircleIcon aria-hidden="true" /> : (badge.icon ?? "🏅")}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 py-1 text-[0.55rem] font-bold tracking-wide uppercase sm:px-3 sm:text-[0.65rem] sm:tracking-wider">
                    {badge.rarity}
                  </span>
                </div>
                <h2 className="mt-1 line-clamp-2 min-h-8 font-heading text-sm leading-4 font-bold sm:mt-4 sm:min-h-0 sm:text-xl sm:leading-normal">
                  {secret ? t("secretBadge") : badge.name}
                </h2>
                <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-muted-foreground sm:min-h-10 sm:text-sm sm:leading-normal sm:line-clamp-none">
                  {secret
                    ? t("secretDescription")
                    : badge.description}
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted sm:mt-4 sm:h-2">
                  <div
                    className="h-full rounded-full bg-reward transition-[width]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between gap-1 text-[0.6rem] font-bold text-muted-foreground sm:mt-2 sm:text-xs">
                  <span>{badge.progress} / {badge.targetValue}</span>
                  <span className="inline-flex items-center gap-1">
                    {unlocked ? <CheckIcon className="size-3 sm:size-3.5" /> : <LockIcon className="size-3 sm:size-3.5" />}
                    <span className="truncate">
                      {unlocked ? t("earned") : t("rewardShort", { points: badge.rewardAmount })}
                    </span>
                  </span>
                </div>
                {unlocked && badge.unlockedAt && (
                  <p className="mt-1 line-clamp-1 text-center text-[0.6rem] leading-3 font-medium text-success-text dark:text-success-text min-[425px]:text-left sm:mt-3 sm:text-xs sm:leading-normal">
                    {t("unlockedOn", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(badge.unlockedAt) })}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </GamePageColumns>
  );
}
