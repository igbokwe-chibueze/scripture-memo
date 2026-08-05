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
import type {
  LeaderboardEntry,
  LeaderboardPageData,
  LeaderboardScope,
} from "@/features/leaderboard/types/leaderboard.types";
import { cn } from "@/lib/utils";
import type { BeaconLeague } from "@/lib/generated/prisma/enums";

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

/** Displays the three ranking values shared by podium and standard rows. */
function leagueLabel(league: BeaconLeague): string {
  return league.charAt(0) + league.slice(1).toLowerCase();
}

/** Displays weekly competition values, or permanent XP on All Time. */
function PlayerStats({
  entry,
  scope,
}: {
  entry: LeaderboardEntry;
  scope: LeaderboardScope;
}): React.ReactNode {
  const t = useTranslations("Leaderboard");

  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-xs font-black">
      <span
        aria-label={
          scope === "all-time"
            ? t("lifetimeXp", { count: entry.beaconXp })
            : t("weeklyXp", { count: entry.weeklyXp })
        }
      >
        <SparklesIcon className="mx-auto mb-1 size-4" aria-hidden="true" />
        {(scope === "all-time" ? entry.beaconXp : entry.weeklyXp).toLocaleString()}
      </span>
      <span
        className="text-amber-600 dark:text-amber-300"
        aria-label={t("level", { count: entry.beaconLevel })}
      >
        <TrophyIcon className="mx-auto mb-1 size-4" aria-hidden="true" />
        {entry.beaconLevel.toLocaleString()}
      </span>
      <span aria-label={t("crowns", { count: entry.crowns })}>
        <CrownIcon className="mx-auto mb-1 size-4" aria-hidden="true" />
        <span className="mt-1 block">{entry.crowns.toLocaleString()}</span>
      </span>
    </div>
  );
}

/** One animated podium card; animation becomes a simple fade for reduced motion. */
function PodiumCard({
  entry,
  featured,
  delay,
  scope,
}: {
  entry: LeaderboardEntry;
  featured: boolean;
  delay: number;
  scope: LeaderboardScope;
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
      <PlayerStats entry={entry} scope={scope} />
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
  scope,
  zone = "steady",
}: {
  entry: LeaderboardEntry;
  pinned?: boolean;
  scope: LeaderboardScope;
  zone?: "promotion" | "steady" | "demotion";
}): React.ReactNode {
  const t = useTranslations("Leaderboard");

  return (
    <article
      className={cn(
        "grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 border-b p-4 last:border-0 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center",
        entry.isCurrentUser && "bg-amber-400/10",
        pinned && "rounded-2xl border border-amber-400/35 bg-amber-400/12",
        zone === "promotion" && "border-l-4 border-l-emerald-500",
        zone === "demotion" && "border-l-4 border-l-rose-500",
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
  const router = useRouter();
  const evaluationStarted = useRef(false);
  const enrollmentStarted = useRef(false);
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
        <section className="mt-4 rounded-3xl border border-violet-400/25 bg-card p-4 shadow-lg sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black tracking-[0.16em] text-violet-700 uppercase dark:text-violet-300">
                {data.scope === "league"
                  ? t("leagueCompetition")
                  : t("weeklyCompetition")}
              </p>
              <p className="mt-1 font-heading text-2xl font-black">
                {data.scope === "league"
                  ? t("leagueName", { league: leagueLabel(data.league) })
                  : data.activeFellowshipName ?? t("country")}
              </p>
            </div>
            <div className="rounded-2xl bg-violet-500/10 px-4 py-3 text-right">
              <p className="text-xs font-bold text-muted-foreground">
                {t("weekEnds")}
              </p>
              <p className="font-black">
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
          {data.scope === "league" && (
            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-black">
              <span className="rounded-xl bg-emerald-500/12 px-3 py-2 text-emerald-700 dark:text-emerald-300">
                {t("promotionZone", { count: data.promotionCount })}
              </span>
              <span className="rounded-xl bg-rose-500/12 px-3 py-2 text-rose-700 dark:text-rose-300">
                {t("demotionZone", { count: data.demotionCount })}
              </span>
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
              {winner && <PodiumCard entry={winner} featured delay={0} scope={data.scope} />}
              {remainingPodium.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {remainingPodium.map((entry, index) => (
                    <PodiumCard
                      key={entry.rank}
                      entry={entry}
                      featured={false}
                      delay={0.12 + index * 0.1}
                      scope={data.scope}
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
