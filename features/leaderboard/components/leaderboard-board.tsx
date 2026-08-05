"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CrownIcon,
  MapPinCheckIcon,
  MedalIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeUnlockSequence } from "@/features/badges/components/badge-unlock-screen";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import { evaluateLeaderboardBadgeAction } from "@/features/leaderboard/actions/evaluate-leaderboard-badge.action";
import { NavigationButton } from "@/components/shared/navigation-button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { initializeBeaconLeagueAction } from "@/features/beacon/actions/initialize-beacon-league.action";
import { LeagueEmblem } from "@/features/beacon/components/league-emblem";
import { LeagueJourneyDialog } from "@/features/beacon/components/league-journey-dialog";
import type {
  LeaderboardEntry,
  LeaderboardPageData,
  LeaderboardScope,
} from "@/features/leaderboard/types/leaderboard.types";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/features/profile/components/player-avatar";

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
  scope: LeaderboardScope,
  page = 1,
  fellowshipId?: string,
): string {
  const parameters = new URLSearchParams({ scope, page: String(page) });
  if (fellowshipId) parameters.set("fellowship", fellowshipId);
  return `/leaderboard?${parameters.toString()}`;
}

/** Compact mobile-first row used for rank four and below. */
function RankingRow({
  entry,
  pinned = false,
  scope,
  zone = "steady",
}: {
  entry: LeaderboardEntry;
  pinned?: boolean;
  scope: LeaderboardScope;
  zone?: "promotion" | "steady" | "demotion";
}): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      initial={{ opacity: 0, x: reduceMotion ? 0 : -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, delay: Math.min(entry.rank, 8) * 0.035 }}
      className={cn(
        "grid grid-cols-[2.5rem_3rem_minmax(0,1fr)] gap-x-3 border-b p-4 last:border-0 sm:grid-cols-[3rem_3.5rem_minmax(0,1fr)_auto] sm:items-center",
        entry.isCurrentUser && "bg-amber-400/10",
        pinned && "rounded-2xl border border-amber-400/35 bg-amber-400/12",
        zone === "promotion" && "border-l-4 border-l-emerald-500",
        zone === "demotion" && "border-l-4 border-l-rose-500",
        entry.rank === 1 && "bg-amber-400/12",
        entry.rank === 2 && "bg-slate-400/10",
        entry.rank === 3 && "bg-orange-500/10",
      )}
    >
      <span className="grid size-10 place-items-center rounded-2xl bg-muted font-heading font-black">
        {entry.rank <= 3 ? (
          <span className="relative">
            <CrownIcon className="size-5" aria-hidden="true" />
            <span className="sr-only">{entry.rank}</span>
          </span>
        ) : entry.rank}
      </span>
      <PlayerAvatar
        avatarKey={entry.avatarKey}
        frameKey={entry.avatarFrameKey}
        displayName={entry.displayName}
        size="sm"
        className="sm:size-14"
      />
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
      <div className="col-start-3 mt-3 flex flex-wrap gap-3 text-xs font-black sm:col-start-auto sm:mt-0">
        <span className="inline-flex items-center gap-1">
          <SparklesIcon className="size-4" aria-hidden="true" />
          {(scope === "all-time" ? entry.beaconXp : entry.weeklyXp).toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300">
          <TrophyIcon className="size-4" aria-hidden="true" />
          {entry.beaconLevel.toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <CrownIcon className="size-4" aria-hidden="true" />
          {entry.crowns.toLocaleString()}
        </span>
      </div>
    </motion.article>
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
  const router = useRouter();
  const evaluationStarted = useRef(false);
  const enrollmentStarted = useRef(false);
  const [badgeUnlocks, setBadgeUnlocks] = useState<BadgeUnlockResult[]>([]);
  const visibleEntries = [...data.podium, ...data.entries]
    .filter(
      (entry, index, allEntries) =>
        allEntries.findIndex((candidate) => candidate.rank === entry.rank) === index,
    )
    .toSorted((left, right) => left.rank - right.rank);
  const currentUserAlreadyVisible = [...data.podium, ...data.entries].some(
    (entry) => entry.isCurrentUser,
  );
  const currentFellowshipParameter = data.activeFellowshipId ?? undefined;
  const isWeeklyScope = data.scope !== "all-time";

  const rankZone = (
    entry: LeaderboardEntry,
  ): "promotion" | "steady" | "demotion" => {
    if (data.scope !== "league") return "steady";
    if (entry.rank <= data.promotionCount) return "promotion";
    if (
      data.totalPlayers >= 10 &&
      entry.rank > data.totalPlayers - data.demotionCount
    ) {
      return "demotion";
    }
    return "steady";
  };

  useEffect(() => {
    if (!data.needsEnrollment || enrollmentStarted.current) return;
    enrollmentStarted.current = true;

    void initializeBeaconLeagueAction().then((result) => {
      if (result.success) {
        router.refresh();
        return;
      }
      toast.error(result.message, { duration: Infinity });
    });
  }, [data.needsEnrollment, router]);

  useEffect(() => {
    // Only the global view can earn Beacon Challenger. The ref prevents React
    // development-mode effect replays from issuing duplicate requests; the
    // badge transaction remains the final idempotency boundary.
    if (data.scope !== "all-time" || evaluationStarted.current) return;
    evaluationStarted.current = true;

    void evaluateLeaderboardBadgeAction().then((result) => {
      if (result.success && result.data) {
        setBadgeUnlocks(result.data.badgeUnlocks);
      }
    });
  }, [data.scope]);

  if (data.needsEnrollment) {
    return (
      <div className="mt-5 flex min-h-56 flex-col items-center justify-center gap-4 rounded-3xl border bg-card p-6 text-center">
        <LoadingSpinner size="lg" label={t("joiningLeague")} />
        <p className="font-heading text-xl font-black">{t("joiningLeague")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Horizontal scrolling preserves comfortable touch targets at 375px. */}
      <nav
        className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        aria-label={t("scopes")}
      >
        <div className="flex min-w-max gap-2">
          <NavigationButton
            href={leaderboardHref("league")}
            pendingLabel={t("opening")}
            variant={data.scope === "league" ? "default" : "outline"}
            className="min-h-11"
          >
            <TrophyIcon aria-hidden="true" />
            {t("myLeague")}
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
          <NavigationButton
            href={leaderboardHref("all-time")}
            pendingLabel={t("opening")}
            variant={data.scope === "all-time" ? "default" : "outline"}
            className="min-h-11"
          >
            <CrownIcon aria-hidden="true" />
            {t("allTime")}
          </NavigationButton>
        </div>
      </nav>

      {isWeeklyScope && (
        <section className="mt-4 overflow-hidden rounded-3xl border border-violet-400/25 bg-linear-to-br from-card via-card to-violet-500/10 p-4 shadow-lg sm:p-6">
          <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:gap-5">
            <div className="grid aspect-square place-items-center">
              {data.scope === "league" ? (
                <LeagueEmblem
                  league={data.league}
                  label={t("leagueEmblemAlt", {
                    league: t(`leagues.${data.league}`),
                  })}
                  priority
                />
              ) : (
                <span className="grid size-20 place-items-center rounded-3xl bg-violet-500/12 text-violet-700 dark:text-violet-300">
                  <TrophyIcon className="size-10" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black tracking-[0.16em] text-violet-700 uppercase dark:text-violet-300">
                {data.scope === "league"
                  ? t("leagueCompetition")
                  : t("weeklyCompetition")}
              </p>
              <p className="mt-1 truncate font-heading text-2xl font-black sm:text-3xl">
                {data.scope === "league"
                  ? t("leagueName", { league: t(`leagues.${data.league}`) })
                  : data.activeFellowshipName ?? t("country")}
              </p>
              <p className="mt-1 text-xs font-bold text-muted-foreground sm:text-sm">
                {t("players", { count: data.totalPlayers })}
              </p>
            </div>
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:flex-col sm:items-end">
              {data.scope === "league" && (
                <LeagueJourneyDialog currentLeague={data.league} />
              )}
              <div className="rounded-2xl bg-violet-500/10 px-3 py-2 text-right">
              <p className="text-xs font-bold text-muted-foreground">
                {t("weekEnds")}
              </p>
              <p className="text-sm font-black">
                {new Intl.DateTimeFormat(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(data.weekEndsAt))}
              </p>
              </div>
            </div>
          </div>
          {data.scope === "league" && (
            <div className="mt-5 rounded-2xl border bg-background/65 p-3">
              <div className="grid grid-cols-3 text-center text-[0.65rem] font-black sm:text-xs">
                <span className="text-emerald-700 dark:text-emerald-300">{t("promote")}</span>
                <span>{t("stay")}</span>
                <span className="text-rose-700 dark:text-rose-300">{t("demote")}</span>
              </div>
              <div className="relative mt-2 flex h-3 overflow-visible rounded-full bg-muted">
                <span
                  className="rounded-l-full bg-emerald-500"
                  style={{ width: `${Math.min(100, (data.promotionCount / Math.max(1, data.totalPlayers)) * 100)}%` }}
                />
                <span className="min-w-3 flex-1 bg-muted" />
                <span
                  className="rounded-r-full bg-rose-400"
                  style={{ width: `${data.totalPlayers >= 10 ? (data.demotionCount / data.totalPlayers) * 100 : 0}%` }}
                />
                {data.currentUser && (
                  <span
                    className="absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-violet-600 font-heading text-xs font-black text-white shadow-lg ring-2 ring-white dark:ring-slate-950"
                    style={{ left: `${Math.min(98, Math.max(2, ((data.currentUser.rank - 0.5) / Math.max(1, data.totalPlayers)) * 100))}%` }}
                    aria-label={t("yourRankNumber", { rank: data.currentUser.rank })}
                  >
                    {data.currentUser.rank}
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs font-black">
                <span className="rounded-xl bg-emerald-500/12 px-2 py-2 text-emerald-700 dark:text-emerald-300">
                  {t("promotionZone", { count: data.promotionCount })}
                </span>
                <span className="rounded-xl bg-rose-500/12 px-2 py-2 text-rose-700 dark:text-rose-300">
                  {data.totalPlayers >= 10
                    ? t("demotionZone", { count: data.demotionCount })
                    : t("noDemotion")}
                </span>
              </div>
            </div>
          )}
        </section>
      )}

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
          <section className="mt-6" aria-labelledby="rankings-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="rankings-title" className="font-heading text-2xl font-black">
                {t("rankings")}
              </h2>
              <span className="text-sm font-bold text-muted-foreground">
                {t("players", { count: data.totalPlayers })}
              </span>
            </div>
            {visibleEntries.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-3xl border bg-card shadow-lg">
                {visibleEntries.map((entry) => (
                  <RankingRow
                    key={entry.rank}
                    entry={entry}
                    scope={data.scope}
                    zone={rankZone(entry)}
                  />
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
              <RankingRow
                entry={data.currentUser}
                scope={data.scope}
                zone={rankZone(data.currentUser)}
                pinned
              />
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
