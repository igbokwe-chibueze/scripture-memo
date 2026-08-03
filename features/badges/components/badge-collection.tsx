"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckIcon, HelpCircleIcon, LockIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { BadgeCollectionItem } from "@/features/badges/types/badge.types";
import type { BadgeCategory, BadgeRarity } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type CollectionFilter = "ALL" | "COMPLETED" | "IN_PROGRESS" | "LOCKED";

const RARITY_RING = {
  COMMON: "border-slate-300 dark:border-slate-600",
  UNCOMMON: "border-emerald-400",
  RARE: "border-sky-400",
  EPIC: "border-violet-400",
  LEGENDARY: "border-amber-400 shadow-amber-400/20",
} as const;

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

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2" aria-label={t("statusFilters")}>
        {(["ALL", "COMPLETED", "IN_PROGRESS", "LOCKED"] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-xs font-black tracking-wide",
              filter === option
                ? "border-amber-400 bg-amber-400 text-slate-950"
                : "border-border bg-card text-muted-foreground",
            )}
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {t(`filters.${option}`)}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-black tracking-wide uppercase">
          {t("category")}
          <select
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold normal-case"
            value={category}
            onChange={(event) => setCategory(event.currentTarget.value as BadgeCategory | "ALL")}
          >
            <option value="ALL">{t("allCategories")}</option>
            {["LEARNING", "STREAK", "MASTERY", "INDEPENDENCE", "SPEED", "EXPLORATION"].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black tracking-wide uppercase">
          {t("rarity")}
          <select
            className="min-h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold normal-case"
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleBadges.map((badge) => {
            const unlocked = badge.status === "COMPLETED";
            const secret = badge.isHidden && !unlocked;
            const progressPercent = Math.min(
              100,
              Math.round((badge.progress / badge.targetValue) * 100),
            );
            return (
              <article
                key={badge.id}
                className={cn(
                  "rounded-3xl border-2 bg-card p-5 shadow-sm",
                  RARITY_RING[badge.rarity],
                  unlocked && badge.rarity === "LEGENDARY" && "shadow-xl",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-16 place-items-center rounded-2xl bg-muted text-3xl">
                    {secret ? <HelpCircleIcon aria-hidden="true" /> : (badge.icon ?? "🏅")}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1 text-[0.65rem] font-black tracking-wider uppercase">
                    {badge.rarity}
                  </span>
                </div>
                <h2 className="mt-4 font-heading text-xl font-black">
                  {secret ? t("secretBadge") : badge.name}
                </h2>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">
                  {secret
                    ? t("secretDescription")
                    : badge.description}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-[width]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs font-bold text-muted-foreground">
                  <span>{badge.progress} / {badge.targetValue}</span>
                  <span className="inline-flex items-center gap-1">
                    {unlocked ? <CheckIcon className="size-3.5" /> : <LockIcon className="size-3.5" />}
                    {unlocked ? t("earned") : t("rewardShort", { points: badge.rewardAmount })}
                  </span>
                </div>
                {unlocked && badge.unlockedAt && (
                  <p className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {t("unlockedOn", { date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(badge.unlockedAt) })}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
