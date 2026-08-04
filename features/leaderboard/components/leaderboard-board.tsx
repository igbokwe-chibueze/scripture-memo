"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CrownIcon,
  FlameIcon,
  MapPinCheckIcon,
  MedalIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { BadgeUnlockSequence } from "@/features/badges/components/badge-unlock-screen";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import { evaluateLeaderboardBadgeAction } from "@/features/leaderboard/actions/evaluate-leaderboard-badge.action";
import { NavigationButton } from "@/components/shared/navigation-button";
import { EmptyState } from "@/components/shared/empty-state";
import type {
  LeaderboardEntry,
  LeaderboardPageData,
} from "@/features/leaderboard/types/leaderboard.types";
import { cn } from "@/lib/utils";

type LeaderboardBoardProps = {
  data: LeaderboardPageData;
};

/** Converts an ISO country code into a compact flag without exposing location data. */
function countryFlag(countryCode: string | null): string {
  // A textual fallback avoids relying on an emoji font that may not be
  // available in embedded browsers or older mobile WebViews.
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return "--";

  return String.fromCodePoint(
    ...countryCode
      .split("")
      .map((character) => 127397 + character.charCodeAt(0)),
  );
}

/** Builds a stable URL for one server-rendered scope and page. */
function leaderboardHref(
  scope: "global" | "country" | "fellowship",
  page = 1,
  fellowshipId?: string,
): string {
  const parameters = new URLSearchParams({ scope, page: String(page) });
  if (fellowshipId) parameters.set("fellowship", fellowshipId);
  return `/leaderboard?${parameters.toString()}`;
}

/** Displays the three ranking values shared by podium and standard rows. */
function PlayerStats({ entry }: { entry: LeaderboardEntry }): React.ReactNode {
  const t = useTranslations("Leaderboard");

  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs font-black">
      <span aria-label={t("waypoints", { count: entry.waypointsCompleted })}>
        <MapPinCheckIcon className="mx-auto mb-1 size-4" aria-hidden="true" />
        {entry.waypointsCompleted.toLocaleString()}
      </span>
      <span
        className="text-amber-600 dark:text-amber-300"
        aria-label={t("glow", { count: entry.glowPoints })}
      >
        <SparklesIcon className="mx-auto mb-1 size-4" aria-hidden="true" />
        {entry.glowPoints.toLocaleString()}
      </span>
      <span aria-label={t("streak", { count: entry.currentStreak })}>
        <FlameIcon className="mx-auto mb-1 size-4" aria-hidden="true" />
        <span className="mt-1 block">{entry.currentStreak.toLocaleString()}</span>
      </span>
    </div>
  );
}

/** One animated podium card; animation becomes a simple fade for reduced motion. */
function PodiumCard({
  entry,
  featured,
  delay,
}: {
  entry: LeaderboardEntry;
  featured: boolean;
  delay: number;
}): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={{ opacity: 0, y: reduceMotion ? 0 : 24, scale: reduceMotion ? 1 : 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.5, delay: reduceMotion ? 0 : delay }}
      className={cn(
        "relative overflow-hidden rounded-3xl border p-4 text-center shadow-lg",
        featured
          ? "border-amber-400/55 bg-linear-to-b from-amber-300/25 to-card"
          : "border-violet-400/25 bg-card",
        entry.isCurrentUser && "ring-3 ring-primary/35",
      )}
    >
      <span
        className={cn(
          "mx-auto grid size-11 place-items-center rounded-2xl font-heading text-xl font-black",
          featured
            ? "bg-amber-400 text-amber-950"
            : "bg-violet-500/12 text-violet-600 dark:text-violet-300",
        )}
      >
        {featured ? <CrownIcon aria-hidden="true" /> : entry.rank}
      </span>
      <p className="mt-3 truncate font-heading text-lg font-black">
        {entry.displayName}
      </p>
      <p className="text-sm text-muted-foreground">
        {countryFlag(entry.countryCode)} {entry.countryCode ?? t("globalPlayer")}
      </p>
      <PlayerStats entry={entry} />
      {entry.isCurrentUser && (
        <span className="mt-3 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">
          {t("you")}
        </span>
      )}
    </motion.article>
  );
}

/** Compact mobile-first row used for rank four and below. */
function RankingRow({
  entry,
  pinned = false,
}: {
  entry: LeaderboardEntry;
  pinned?: boolean;
}): React.ReactNode {
  const t = useTranslations("Leaderboard");

  return (
    <article
      className={cn(
        "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-b p-4 last:border-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center",
        entry.isCurrentUser && "bg-amber-400/10",
        pinned && "rounded-2xl border border-amber-400/35 bg-amber-400/12",
      )}
    >
      <span className="grid size-10 place-items-center rounded-2xl bg-muted font-heading font-black">
        {entry.rank}
      </span>
      <div className="min-w-0">
        <p className="truncate font-black">
          {entry.displayName}
          {entry.isCurrentUser && (
            <span className="ml-2 text-xs text-amber-700 dark:text-amber-300">
              {t("you")}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          {countryFlag(entry.countryCode)} {entry.countryCode ?? t("globalPlayer")}
        </p>
      </div>
      <div className="col-start-2 mt-3 flex flex-wrap gap-3 text-xs font-black sm:col-start-auto sm:mt-0">
        <span className="inline-flex items-center gap-1">
          <MapPinCheckIcon className="size-4" aria-hidden="true" />
          {entry.waypointsCompleted.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
          <SparklesIcon className="size-4" aria-hidden="true" />
          {entry.glowPoints.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <FlameIcon className="size-4" aria-hidden="true" />
          {entry.currentStreak.toLocaleString()}
        </span>
      </div>
    </article>
  );
}

/**
 * Great Beacon interaction surface. Ranking data is already authorized and
 * privacy-filtered by the server repository before reaching this component.
 */
export function LeaderboardBoard({
  data,
}: LeaderboardBoardProps): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const evaluationStarted = useRef(false);
  const [badgeUnlocks, setBadgeUnlocks] = useState<BadgeUnlockResult[]>([]);
  const podiumByRank = new Map(data.podium.map((entry) => [entry.rank, entry]));
  const winner = podiumByRank.get(1);
  const remainingPodium = [podiumByRank.get(2), podiumByRank.get(3)].filter(
    (entry): entry is LeaderboardEntry => Boolean(entry),
  );
  const currentUserAlreadyVisible = [...data.podium, ...data.entries].some(
    (entry) => entry.isCurrentUser,
  );
  const currentFellowshipParameter = data.activeFellowshipId ?? undefined;

  useEffect(() => {
    // Only the global view can earn Beacon Challenger. The ref prevents React
    // development-mode effect replays from issuing duplicate requests; the
    // badge transaction remains the final idempotency boundary.
    if (data.scope !== "global" || evaluationStarted.current) return;
    evaluationStarted.current = true;

    void evaluateLeaderboardBadgeAction().then((result) => {
      if (result.success && result.data) {
        setBadgeUnlocks(result.data.badgeUnlocks);
      }
    });
  }, [data.scope]);

  return (
    <>
      {/* Horizontal scrolling preserves comfortable touch targets at 375px. */}
      <nav
        className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        aria-label={t("scopes")}
      >
        <div className="flex min-w-max gap-2">
          <NavigationButton
            href={leaderboardHref("global")}
            pendingLabel={t("opening")}
            variant={data.scope === "global" ? "default" : "outline"}
            className="min-h-11"
          >
            <TrophyIcon aria-hidden="true" />
            {t("global")}
          </NavigationButton>
          <NavigationButton
            href={leaderboardHref("country")}
            pendingLabel={t("opening")}
            variant={data.scope === "country" ? "default" : "outline"}
            className="min-h-11"
          >
            {countryFlag(data.countryCode)} {t("country")}
          </NavigationButton>
          {data.fellowships.map((fellowship) => (
            <NavigationButton
              key={fellowship.id}
              href={leaderboardHref("fellowship", 1, fellowship.id)}
              pendingLabel={t("opening")}
              variant={
                data.scope === "fellowship" &&
                data.activeFellowshipId === fellowship.id
                  ? "default"
                  : "outline"
              }
              className="min-h-11"
            >
              <MedalIcon aria-hidden="true" />
              {fellowship.name}
            </NavigationButton>
          ))}
        </div>
      </nav>

      {!data.countryCode && data.scope === "country" ? (
        <EmptyState
          className="mt-5"
          icon={<MapPinCheckIcon />}
          title={t("countryMissing")}
          description={t("countryMissingDescription")}
          action={
            <NavigationButton
              href="/settings"
              pendingLabel={t("opening")}
            >
              {t("chooseCountry")}
            </NavigationButton>
          }
        />
      ) : data.totalPlayers === 0 ? (
        <EmptyState
          className="mt-5"
          icon={<TrophyIcon />}
          title={t("empty")}
          description={t("emptyDescription")}
        />
      ) : (
        <>
          <section className="mt-6" aria-labelledby="podium-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="podium-title" className="font-heading text-2xl font-black">
                {t("podium")}
              </h2>
              <span className="text-sm font-bold text-muted-foreground">
                {t("players", { count: data.totalPlayers })}
              </span>
            </div>

            {/* Winner leads mobile reading order; second and third share a row. */}
            <div className="mt-4 grid gap-3">
              {winner && <PodiumCard entry={winner} featured delay={0} />}
              {remainingPodium.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {remainingPodium.map((entry, index) => (
                    <PodiumCard
                      key={entry.rank}
                      entry={entry}
                      featured={false}
                      delay={0.12 + index * 0.1}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-7" aria-labelledby="rankings-title">
            <h2 id="rankings-title" className="font-heading text-2xl font-black">
              {t("rankings")}
            </h2>

            {data.entries.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-3xl border bg-card shadow-lg">
                {data.entries.map((entry) => (
                  <RankingRow key={entry.rank} entry={entry} />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border bg-card p-5 text-center text-muted-foreground">
                {t("noMorePlayers")}
              </p>
            )}

            {data.totalPages > 1 && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <NavigationButton
                  href={leaderboardHref(
                    data.scope,
                    Math.max(1, data.page - 1),
                    currentFellowshipParameter,
                  )}
                  pendingLabel={t("opening")}
                  variant="outline"
                  aria-disabled={data.page === 1}
                  className={cn("w-full", data.page === 1 && "pointer-events-none opacity-50")}
                >
                  {t("previous")}
                </NavigationButton>
                <NavigationButton
                  href={leaderboardHref(
                    data.scope,
                    Math.min(data.totalPages, data.page + 1),
                    currentFellowshipParameter,
                  )}
                  pendingLabel={t("opening")}
                  aria-disabled={data.page === data.totalPages}
                  className={cn(
                    "w-full",
                    data.page === data.totalPages && "pointer-events-none opacity-50",
                  )}
                >
                  {t("next")}
                </NavigationButton>
              </div>
            )}
          </section>

          {data.currentUser && !currentUserAlreadyVisible && (
            <aside className="sticky bottom-24 z-20 mt-5" aria-label={t("yourRank")}>
              <p className="mb-2 text-xs font-black tracking-wider text-amber-700 uppercase dark:text-amber-300">
                {t("yourRank")}
              </p>
              <RankingRow entry={data.currentUser} pinned />
            </aside>
          )}
        </>
      )}

      {badgeUnlocks.length > 0 && (
        <BadgeUnlockSequence
          badges={badgeUnlocks}
          index={0}
          onAdvance={() => window.location.reload()}
        />
      )}
    </>
  );
}
