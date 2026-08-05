"use client";

import {
  CrownIcon,
  CompassIcon,
  FlameIcon,
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
import { BEACON_COHORT_SIZE } from "@/features/beacon/constants/beacon-progression";
import type {
  LeaderboardEntry,
  LeaderboardPageData,
  LeaderboardScope,
} from "@/features/leaderboard/types/leaderboard.types";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/features/profile/components/player-avatar";
import { CountryFlag } from "@/components/shared/country-flag";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type LeaderboardBoardProps = {
  data: LeaderboardPageData;
};

/**
 * Shows a compact league deadline without making the server-rendered markup
 * depend on the device clock. The placeholder is identical during SSR and the
 * first client render; the real value appears immediately after hydration.
 */
function LeagueRemainingTime({ endsAt }: { endsAt: string }): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const deadline = new Date(endsAt).getTime();

    const updateRemainingTime = (): void => {
      setRemainingMs(Math.max(0, deadline - Date.now()));
    };

    updateRemainingTime();
    const intervalId = window.setInterval(updateRemainingTime, 60_000);

    return () => window.clearInterval(intervalId);
  }, [endsAt]);

  if (remainingMs === null) {
    return <>{t("leagueEndsSoon")}</>;
  }

  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return <>{t("leagueEndsInDays", { days, hours })}</>;
  }

  if (hours > 0) {
    return <>{t("leagueEndsInHours", { hours, minutes })}</>;
  }

  return <>{t("leagueEndsInMinutes", { minutes })}</>;
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

/** A compact filled crown designed specifically for the top-three rank plates. */
function RankCrownIcon({ className }: { className?: string }): React.ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="m3.2 7.2 4.3 3.1L12 4l4.5 6.3 4.3-3.1-1.7 9.1H4.9L3.2 7.2Zm2.1 10.6h13.4v2H5.3v-2Z"
      />
    </svg>
  );
}

/** Gives podium places and the signed-in player distinct, game-like rank plates. */
function RankPlate({
  position,
  isCurrentUser,
}: {
  position: number;
  isCurrentUser: boolean;
}): React.ReactNode {
  const isPodium = position <= 3;

  return (
    <span
      className={cn(
        "grid min-h-12 grid-cols-[auto_auto] place-content-center gap-0.5 rounded-lg border px-1 font-heading text-base font-black shadow-[0_3px_0_rgb(0_0_0/0.18)] sm:min-h-16 sm:gap-1 sm:rounded-2xl sm:px-2 sm:text-xl",
        position === 1 &&
          "border-yellow-500 bg-linear-to-br from-yellow-200 via-amber-300 to-yellow-500 text-amber-950",
        position === 2 &&
          "border-slate-400 bg-linear-to-br from-white via-slate-200 to-slate-400 text-slate-800",
        position === 3 &&
          "border-orange-600 bg-linear-to-br from-orange-200 via-amber-500 to-orange-700 text-orange-950",
        !isPodium &&
          !isCurrentUser &&
          "border-border bg-muted/55 text-foreground",
        !isPodium &&
          isCurrentUser &&
          "border-violet-500 bg-linear-to-br from-violet-500 to-purple-800 text-white",
      )}
    >
      <span>{position}</span>
      {isPodium && <RankCrownIcon className="size-3.5 sm:size-5" />}
    </span>
  );
}

/** Compact mobile-first row used for rank four and below. */
function RankingRow({
  entry,
  displayedPosition,
  onSelect,
  pinned = false,
  scope,
  zone = "steady",
}: {
  entry: LeaderboardEntry;
  displayedPosition: number;
  onSelect: (entry: LeaderboardEntry) => void;
  pinned?: boolean;
  scope: LeaderboardScope;
  zone?: "promotion" | "steady" | "demotion";
}): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const isRival = entry.kind === "RIVAL";
  const visibleDisplayName = entry.isCurrentUser
    ? t("you")
    : entry.displayName;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry)}
      onKeyDown={(event) => {
        // Rows behave like one large touch target while remaining operable for
        // keyboard players without nesting interactive buttons inside buttons.
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(entry);
        }
      }}
      className={cn(
        "grid min-h-24 w-full grid-cols-[2.75rem_2.75rem_minmax(0,1fr)_auto] items-center gap-x-2 border-b px-3 py-4 text-left last:border-0 hover:bg-muted/45 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-primary sm:min-h-28 sm:grid-cols-[4rem_3.5rem_minmax(0,1fr)_auto] sm:gap-x-3 sm:px-4 sm:py-5",
        entry.isCurrentUser &&
          "bg-violet-500/10 text-violet-950 dark:text-violet-100",
        pinned && "rounded-2xl border border-violet-400/40 bg-violet-500/10",
        zone === "promotion" && "border-l-4 border-l-emerald-500",
        zone === "demotion" && "border-l-4 border-l-rose-500",
      )}
    >
      <RankPlate
        position={displayedPosition}
        isCurrentUser={entry.isCurrentUser}
      />
      <PlayerAvatar
        avatarKey={entry.avatarKey}
        frameKey={entry.avatarFrameKey}
        displayName={visibleDisplayName}
        size="sm"
        className="size-11 sm:size-14"
        isOnline={entry.isOnline}
        loading={displayedPosition <= 3 ? "eager" : "lazy"}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-black sm:text-lg">
          {visibleDisplayName}
          {isRival && (
            <Tooltip>
              <TooltipTrigger
                aria-label={t("trailRival")}
                className="ml-2 inline-grid size-6 place-items-center rounded-full bg-violet-500/10 align-middle text-violet-600 dark:text-violet-300"
                onClick={(event) => event.stopPropagation()}
              >
                <CompassIcon className="size-4" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>{t("trailRivalExplanation")}</TooltipContent>
            </Tooltip>
          )}
        </p>
        <CountryFlag
          countryCode={entry.countryCode}
          label={entry.countryCode ? t("countryFlag") : t("globalPlayer")}
          className="mt-1.5 h-5 w-7 sm:h-6 sm:w-9"
        />
      </div>
      <div className="text-sm font-black sm:text-lg">
        <span className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-primary/10 px-2 py-2 text-primary sm:min-h-12 sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-3">
          <SparklesIcon className="size-4 shrink-0 sm:size-5" aria-hidden="true" />
          {(scope === "all-time" ? entry.beaconXp : entry.weeklyXp).toLocaleString()}
        </span>
      </div>
    </article>
  );
}

/** Shows secondary stats only after the player explicitly asks for details. */
function PlayerDetailsDialog({
  entry,
  onOpenChange,
}: {
  entry: LeaderboardEntry | null;
  onOpenChange: (open: boolean) => void;
}): React.ReactNode {
  const t = useTranslations("Leaderboard");

  return (
    <Dialog open={entry !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6">
        {entry && (
          <>
            <DialogHeader className="items-center pr-10 text-center">
              <PlayerAvatar
                avatarKey={entry.avatarKey}
                frameKey={entry.avatarFrameKey}
                displayName={entry.displayName}
                size="lg"
                isOnline={entry.isOnline}
              />
              <DialogTitle className="text-2xl font-black">
                {entry.displayName}
              </DialogTitle>
              <DialogDescription>
                {entry.kind === "RIVAL"
                  ? t("trailRivalExplanation")
                  : t("playerDetailsDescription")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border bg-muted/50 p-4">
                <SparklesIcon
                  className="mb-3 size-6 text-violet-500"
                  aria-hidden="true"
                />
                <p className="text-xs font-bold text-muted-foreground">
                  {t("weeklyBeaconPoints")}
                </p>
                <p className="mt-1 text-xl font-black">
                  {entry.weeklyXp.toLocaleString()}
                </p>
              </div>
              {entry.kind === "PLAYER" && (
                <>
                  <div className="rounded-2xl border bg-muted/50 p-4">
                    <TrophyIcon
                      className="mb-3 size-6 text-amber-500"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-bold text-muted-foreground">
                      {t("beaconLevel")}
                    </p>
                    <p className="mt-1 text-xl font-black">
                      {entry.beaconLevel.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/50 p-4">
                    <FlameIcon
                      className="mb-3 size-6 text-orange-500"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-bold text-muted-foreground">
                      {t("lifetimeBeaconPoints")}
                    </p>
                    <p className="mt-1 text-xl font-black">
                      {entry.beaconXp.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/50 p-4">
                    <CrownIcon
                      className="mb-3 size-6 text-yellow-500"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-bold text-muted-foreground">
                      {t("crownsLabel")}
                    </p>
                    <p className="mt-1 text-xl font-black">
                      {entry.crowns.toLocaleString()}
                    </p>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
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
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const realVisibleEntries = [...data.podium, ...data.entries]
    .filter(
      (entry, index, allEntries) =>
        allEntries.findIndex((candidate) => candidate.rank === entry.rank) === index,
    );
  const visibleEntries = [...realVisibleEntries, ...data.rivals].toSorted(
    (left, right) => {
      if (data.scope === "all-time") {
        return (left.rank ?? Number.MAX_SAFE_INTEGER) -
          (right.rank ?? Number.MAX_SAFE_INTEGER);
      }
      return right.weeklyXp - left.weeklyXp;
    },
  );
  const currentUserAlreadyVisible = [...data.podium, ...data.entries].some(
    (entry) => entry.isCurrentUser,
  );
  const currentFellowshipParameter = data.activeFellowshipId ?? undefined;
  const isWeeklyScope = data.scope !== "all-time";

  const rankZone = (
    entry: LeaderboardEntry,
  ): "promotion" | "steady" | "demotion" => {
    if (entry.kind === "RIVAL" || entry.rank === null) return "steady";
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
    if (data.scope !== "league" && data.scope !== "country") return;

    // Periodic refresh reveals completed rival sessions and updated real-player
    // presence without presenting continuously fabricated score movement.
    const refreshId = window.setInterval(() => router.refresh(), 3 * 60 * 1000);
    return () => window.clearInterval(refreshId);
  }, [data.scope, router]);

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
            <CountryFlag
              countryCode={data.countryCode}
              label={t("countryFlag")}
            />
            {t("country")}
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
        <section className="mt-4 overflow-hidden rounded-3xl border border-violet-400/25 bg-linear-to-br from-card via-card to-violet-500/10 p-3 shadow-lg sm:p-6">
          <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] items-center gap-2.5 max-[359px]:grid-cols-[5rem_minmax(0,1fr)] sm:grid-cols-[10.5rem_minmax(0,1fr)_auto] sm:gap-5">
            <div className="grid size-[5.75rem] place-items-center max-[359px]:size-20 sm:size-auto sm:aspect-square">
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
              <p className="text-[0.6875rem] font-black tracking-[0.14em] text-violet-700 uppercase dark:text-violet-300 sm:text-xs sm:tracking-[0.16em]">
                {data.scope === "league"
                  ? t("leagueCompetition")
                  : t("weeklyCompetition")}
              </p>
              <p className="mt-1 font-heading text-xl leading-tight font-black max-[359px]:text-lg max-[359px]:whitespace-nowrap sm:text-3xl">
                {data.scope === "league"
                  ? t("leagueName", { league: t(`leagues.${data.league}`) })
                  : data.activeFellowshipName ?? t("country")}
              </p>
              <p className="mt-1 text-xs font-bold text-muted-foreground sm:text-sm">
                <LeagueRemainingTime endsAt={data.weekEndsAt} />
              </p>
            </div>
            <div className="col-span-2 mt-1 grid grid-cols-[auto_minmax(0,1fr)] items-stretch gap-2 sm:col-span-1 sm:mt-0 sm:flex sm:flex-col sm:items-end">
              {data.scope === "league" && (
                <LeagueJourneyDialog currentLeague={data.league} />
              )}
              <div className="grid content-center rounded-xl bg-violet-500/10 px-2.5 py-1.5 text-center sm:rounded-2xl sm:px-3 sm:py-2 sm:text-right">
                <p className="text-[0.6875rem] font-bold leading-tight text-muted-foreground sm:text-xs">
                  {t("weekEnds")}
                </p>
                <p className="mt-0.5 text-xs leading-tight font-black sm:text-sm">
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
            <div className="mt-4 rounded-2xl border bg-background/65 p-3 sm:mt-5">
              <div className="grid grid-cols-3 text-center text-[0.65rem] font-black sm:text-xs">
                <span className="grid gap-0.5 text-emerald-700 dark:text-emerald-300">
                  <span>{t("promote")}</span>
                  <span>{t("topCount", { count: data.promotionCount })}</span>
                </span>
                <span className="self-start">{t("stay")}</span>
                <span className="grid gap-0.5 text-rose-700 dark:text-rose-300">
                  <span>{t("demote")}</span>
                  <span>{t("bottomCount", { count: data.demotionCount })}</span>
                </span>
              </div>
              <div className="relative mt-2 flex h-3 overflow-visible rounded-full">
                <span
                  className="rounded-l-full bg-emerald-500"
                  style={{ flex: data.promotionCount }}
                />
                <span
                  className="bg-slate-300 dark:bg-slate-600"
                  style={{
                    flex:
                      BEACON_COHORT_SIZE -
                      data.promotionCount -
                      data.demotionCount,
                  }}
                />
                <span
                  className="rounded-r-full bg-rose-400"
                  style={{ flex: data.demotionCount }}
                />
                {data.currentUser && (
                  <span
                    className="absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl bg-violet-600 font-heading text-xs font-black text-white shadow-lg ring-2 ring-white dark:ring-slate-950"
                    style={{
                      left: `${Math.min(
                        98,
                        Math.max(
                          2,
                          (((data.currentUser.rank ?? 1) - 0.5) /
                            BEACON_COHORT_SIZE) *
                            100,
                        ),
                      )}%`,
                    }}
                    aria-label={t("yourRankNumber", {
                      rank: data.currentUser.rank ?? 1,
                    })}
                  >
                    {data.currentUser.rank ?? 1}
                  </span>
                )}
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
              {/*
               * Temporarily hidden while the live leaderboard population is
               * small. Keep the localized count nearby so it can be restored
               * without rebuilding the heading when participation grows.
               */}
              {/*
                <span className="text-sm font-bold text-muted-foreground">
                  {t("players", { count: data.totalPlayers })}
                </span>
              */}
            </div>
            {visibleEntries.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-3xl border bg-card shadow-lg">
                <div className="grid min-h-14 grid-cols-[2.75rem_2.75rem_minmax(0,1fr)_auto] items-center gap-x-2 border-b bg-muted/45 px-3 py-3 text-[0.6875rem] font-black tracking-wide text-muted-foreground uppercase sm:min-h-16 sm:grid-cols-[4rem_3.5rem_minmax(0,1fr)_auto] sm:gap-x-3 sm:px-4 sm:text-xs">
                  <span>{t("rankHeader")}</span>
                  <span className="col-span-2">{t("playerHeader")}</span>
                  <span className="max-w-20 text-center leading-tight">
                    {t("beaconPointsHeader")}
                  </span>
                </div>
                {visibleEntries.map((entry, index) => (
                  <RankingRow
                    key={
                      entry.kind === "RIVAL"
                        ? `rival-${entry.displayName}-${entry.avatarKey}-${index}`
                        : `player-${entry.rank}`
                    }
                    entry={entry}
                    displayedPosition={index + 1}
                    onSelect={setSelectedEntry}
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
                displayedPosition={data.currentUser.rank ?? 1}
                onSelect={setSelectedEntry}
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

      <PlayerDetailsDialog
        entry={selectedEntry}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
      />
    </>
  );
}
