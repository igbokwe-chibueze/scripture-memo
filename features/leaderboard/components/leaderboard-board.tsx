"use client";

import Image from "next/image";

import {
  CrownIcon,
  CompassIcon,
  FlameIcon,
  MapPinCheckIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { NavigationButton } from "@/components/shared/navigation-button";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { initializeBeaconLeagueAction } from "@/features/beacon/actions/initialize-beacon-league.action";
import { LeagueEmblem, LeagueJourneyDialog } from "@/features/beacon";
import { Button } from "@/components/ui/button";
import type {
  LeaderboardEntry,
  LeaderboardPageData,
  LeaderboardScope,
} from "@/features/leaderboard/types/leaderboard.types";
import { cn } from "@/lib/utils";
import { PlayerAvatar } from "@/features/profile";
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

import { LeaderboardPodium, BeaconScore } from "./leaderboard-podium";
import styles from "./leaderboard.module.css";

type LeaderboardBoardProps = {
  data: LeaderboardPageData;
  /** Server timestamp keeps the first countdown render identical on every device. */
  initialTime: number;
};

/**
 * Render a real countdown during SSR and hydration, using the same serialized
 * server timestamp. Browser ticks take over afterward; no DB polling is added.
 */
function LeagueRemainingTime({
  endsAt,
  initialTime,
}: {
  endsAt: string;
  initialTime: number;
}): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const [remainingMs, setRemainingMs] = useState(
    () => Math.max(0, new Date(endsAt).getTime() - initialTime),
  );

  useEffect(() => {
    const deadline = new Date(endsAt).getTime();

    const updateRemainingTime = (): void => {
      setRemainingMs(Math.max(0, deadline - Date.now()));
    };

    updateRemainingTime();
    const intervalId = window.setInterval(updateRemainingTime, 60_000);

    return () => window.clearInterval(intervalId);
  }, [endsAt]);

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

/** Compact row preserves equipped cosmetics and the official server rank. */
function RankingRow({
  entry,
  displayedPosition,
  onSelect,
  scope,
  pinned = false,
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
  return (
    <article
      id={entry.isCurrentUser && !pinned ? "leaderboard-you" : undefined}
      role="button"
      tabIndex={0}
      className={styles.row}
      data-you={entry.isCurrentUser}
      data-scope={scope}
      onClick={() => onSelect(entry)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(entry);
        }
      }}
    >
      <strong>{isRival ? "?" : entry.rank ?? displayedPosition}</strong>
      <span className={styles.player}>
        <PlayerAvatar
          avatarKey={entry.avatarKey}
          frameKey={entry.avatarFrameKey}
          displayName={entry.displayName}
          size="sm"
          className="size-9 sm:size-10"
          isOnline={entry.isOnline}
        />
        <CountryFlag countryCode={entry.countryCode} label={t("countryFlag")} />
        <span className={styles.playerName}>
          {entry.displayName}{entry.isCurrentUser ? " (" + t("you") + ")" : ""}
        </span>
        {isRival ? (
          <Tooltip>
            <TooltipTrigger
              className="grid size-11 shrink-0 place-items-center"
              aria-label={t("trailRival")}
              onClick={(event) => event.stopPropagation()}
            >
              <CompassIcon className="size-4" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>{t("trailRivalExplanation")}</TooltipContent>
          </Tooltip>
        ) : null}
      </span>
      <BeaconScore value={scope === "all-time" ? entry.beaconXp : entry.weeklyXp} />
      {scope === "league" && !isRival ? (
        <span className={styles.status} data-zone={zone}>
          {t(zone === "promotion" ? "promote" : zone === "demotion" ? "demote" : "stay")}
        </span>
      ) : <span />}
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
              <DialogTitle className="text-2xl font-bold">
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
                  className="mb-3 size-6 text-selection-text"
                  aria-hidden="true"
                />
                <p className="text-xs font-bold text-muted-foreground">
                  {t("weeklyBeaconPoints")}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {entry.weeklyXp.toLocaleString()}
                </p>
              </div>
              {entry.kind === "PLAYER" && (
                <>
                  <div className="rounded-2xl border bg-muted/50 p-4">
                    <TrophyIcon
                      className="mb-3 size-6 text-reward-text"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-bold text-muted-foreground">
                      {t("beaconLevel")}
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {entry.beaconLevel.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/50 p-4">
                    <FlameIcon
                      className="mb-3 size-6 text-decoration-text"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-bold text-muted-foreground">
                      {t("lifetimeBeaconPoints")}
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {entry.beaconXp.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/50 p-4">
                    <CrownIcon
                      className="mb-3 size-6 text-reward-text"
                      aria-hidden="true"
                    />
                    <p className="text-xs font-bold text-muted-foreground">
                      {t("crownsLabel")}
                    </p>
                    <p className="mt-1 text-xl font-bold">
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
  initialTime,
}: LeaderboardBoardProps): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const router = useRouter();
  const enrollmentStarted = useRef(false);
  const [isFellowshipPending, startFellowshipNavigation] = useTransition();
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
  const listEntries = visibleEntries.filter((entry) => entry.kind === "RIVAL" || (entry.rank ?? 0) > 3);
  const currentUserAlreadyVisible = [...data.podium, ...data.entries].some(
    (entry) => entry.isCurrentUser,
  );
  const currentFellowshipParameter = data.activeFellowshipId ?? undefined;
  const isWeeklyScope = data.scope !== "all-time";
  // The three visual zones are fixed. Only the learner's marker moves within
  // its zone; a sparse cohort must never collapse the other colored sections.
  const promotionSlots = data.promotionCount;
  const demotionSlots = data.demotionCount;
  const steadySlots = Math.max(0, data.totalPlayers - promotionSlots - demotionSlots);
  const playerRank = data.currentUser?.rank ?? 1;
  const third = 100 / 3;
  const markerPercent = playerRank <= promotionSlots
    ? ((playerRank - 0.5) / promotionSlots) * third
    : playerRank > data.totalPlayers - demotionSlots
      ? 2 * third + ((playerRank - (data.totalPlayers - demotionSlots) - 0.5) / demotionSlots) * third
      : third + ((playerRank - promotionSlots - 0.5) / Math.max(1, steadySlots)) * third;

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
    const refreshId = window.setInterval(() => {
      // WHY: A hidden leaderboard cannot provide useful live feedback. Avoiding
      // full server refreshes in background tabs prevents silent, recurring
      // database consumption while preserving occasional visible updates.
      if (document.visibilityState === "visible") router.refresh();
    }, 15 * 60 * 1000);
    return () => window.clearInterval(refreshId);
  }, [data.scope, router]);

  if (data.needsEnrollment) {
    return (
      <div className="mt-5 flex min-h-56 flex-col items-center justify-center gap-4 rounded-3xl border bg-card p-6 text-center">
        <LoadingSpinner size="lg" label={t("joiningLeague")} />
        <p className="font-heading text-xl font-bold">{t("joiningLeague")}</p>
      </div>
    );
  }

  return (
    <>
      <nav className={styles.tabs} aria-label={t("scopes")}>
        {(["league", "country", "fellowship", "all-time"] as const).map((scope) => (
          <NavigationButton
            key={scope}
            href={leaderboardHref(
              scope, 1,
              scope === "fellowship"
                ? data.activeFellowshipId ?? data.fellowships[0]?.id
                : undefined,
            )}
            pendingLabel={t("opening")}
            variant={data.scope === scope ? "default" : "secondary"}
            aria-current={data.scope === scope ? "page" : undefined}
          >
            {t(scope === "league" ? "myLeague" : scope === "country" ? "country" : scope === "fellowship" ? "fellowships" : "allTime")}
          </NavigationButton>
        ))}
      </nav>

      {data.scope === "fellowship" && data.fellowships.length > 1 ? (
        <div className="mb-3 rounded-2xl border bg-card p-3">
          <div className="flex min-h-5 items-center justify-between gap-2">
            <label
              htmlFor="leaderboard-fellowship"
              className="text-xs font-bold tracking-wide text-muted-foreground uppercase"
            >
              {t("chooseFellowship")}
            </label>
            {isFellowshipPending ? (
              <LoadingSpinner size="sm" label={t("opening")} />
            ) : null}
          </div>
          <select
            id="leaderboard-fellowship"
            value={data.activeFellowshipId ?? ""}
            disabled={isFellowshipPending}
            aria-busy={isFellowshipPending}
            onChange={(event) => {
              const fellowshipId = event.target.value;
              startFellowshipNavigation(() => {
                router.push(leaderboardHref("fellowship", 1, fellowshipId));
              });
            }}
            className="mt-2 min-h-11 w-full rounded-xl border border-input bg-background px-3 font-bold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            {data.fellowships.map((fellowship) => (
              <option key={fellowship.id} value={fellowship.id}>
                {fellowship.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {isWeeklyScope && (
        <section className={styles.weekly}>
          <div className={styles.weekHeading}>
            {data.scope === "league" ? (
              <LeagueEmblem
                league={data.league}
                label={t("leagueEmblemAlt", { league: t("leagues." + data.league) })}
                priority
              />
            ) : data.scope === "country" ? (
              <Image
                src="/images/game-ui/leaderboard/country-globe.png"
                alt=""
                width={1254}
                height={1254}
                sizes="(max-width: 640px) 72px, 80px"
                className="size-full object-contain"
              />
            ) : <TrophyIcon className="size-14 text-primary" aria-hidden="true" />}
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-widest text-primary uppercase">
                {t(data.scope === "league" ? "leagueCompetition" : "weeklyCompetition")}
              </p>
              <h2>
                {data.scope === "league"
                  ? t("leagueName", { league: t("leagues." + data.league) })
                  : data.activeFellowshipName ?? t(data.scope === "fellowship" ? "fellowships" : "country")}
              </h2>
              <p className="mt-1 text-sm font-bold text-muted-foreground">
                <LeagueRemainingTime endsAt={data.weekEndsAt} initialTime={initialTime} />
              </p>
            </div>
            <div className={styles.headerActions}>
              <div className={styles.reset}>
                <p>{t("weekEnds")}</p>
                <strong>
                  {new Intl.DateTimeFormat(undefined, {
                    timeZone: "UTC",
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(data.weekEndsAt))}
                </strong>
              </div>
              {data.scope === "league" ? (
                <div className={styles.rankInfo}>
                  <LeagueJourneyDialog currentLeague={data.league} />
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}
      {data.scope === "league" && data.totalPlayers > 0 ? (
        <div className={styles.zones}>
          {/* Fixed zones describe the league rules, even with one player.
            Simulated rivals do not affect the official player's marker. */}
          <div className={styles.zoneBar}>
            <span />
            <span />
            <span />
            {data.currentUser?.rank ? (
              <strong
                className={styles.rankMarker}
                style={{ left: Math.min(97, Math.max(3, markerPercent)) + "%" }}
                aria-label={t("yourRankNumber", { rank: data.currentUser.rank })}
              >
                {data.currentUser.rank}
              </strong>
            ) : null}
          </div>
          <div className={styles.zoneLabels}>
            <span className="flex-1">
              {t("topCount", { count: promotionSlots })}
              <br />
              {t("promote")}
            </span>
            <span className="flex-1">
              {t("stay")}
            </span>
            <span className="flex-1">
              {t("bottomCount", { count: demotionSlots })}
              <br />
              {t("demote")}
            </span>
          </div>
        </div>
      ) : null}

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
              className="min-h-11"
            >
              {t("chooseCountry")}
            </NavigationButton>
          }
        />
      ) : data.scope === "fellowship" && data.fellowships.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={<Image src="/images/game-ui/fellowship.png" alt="" width={64} height={64} />}
          title={t("fellowshipMissing")}
          description={t("fellowshipMissingDescription")}
          action={
            <NavigationButton href="/fellowships" pendingLabel={t("opening")} className="min-h-11">
              {t("joinFellowship")}
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
          <LeaderboardPodium
            entries={data.podium}
            scope={data.scope}
            onSelect={setSelectedEntry}
          />
          <section className={styles.table} aria-label={t("rankings")}>
            {listEntries.length > 0 ? (
              <div>
                <div className={styles.tableHeader} data-scope={data.scope}>
                  <span>{t("rankHeader")}</span>
                  <span>{t("playerHeader")}</span>
                  <span>{t("beaconPointsHeader")}</span>
                  <span>{data.scope === "league" ? t("promotionZone", { count: data.promotionCount }) : ""}</span>
                </div>
                {listEntries.map((entry, index) => (
                  <RankingRow
                    key={entry.kind === "RIVAL" ? "rival-" + entry.displayName + index : "player-" + entry.rank}
                    entry={entry}
                    displayedPosition={index + 4}
                    onSelect={setSelectedEntry}
                    scope={data.scope}
                    zone={rankZone(entry)}
                  />
                ))}
              </div>
            ) : null}

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
                  className={cn("min-h-11 w-full", data.page === 1 && "pointer-events-none opacity-50")}
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
                    "min-h-11 w-full",
                    data.page === data.totalPages && "pointer-events-none opacity-50",
                  )}
                >
                  {t("next")}
                </NavigationButton>
              </div>
            )}
          </section>

          {data.currentUser && (
            <aside className={cn(styles.pinned, "xl:hidden")} aria-label={t("yourRank")}>
              <RankingRow
                entry={data.currentUser}
                displayedPosition={data.currentUser.rank ?? 1}
                onSelect={setSelectedEntry}
                scope={data.scope}
                zone={rankZone(data.currentUser)}
                pinned
              />
              <Button
                size="sm"
                className="mt-1 w-full"
                onClick={() => {
                  if (currentUserAlreadyVisible) {
                    document.getElementById("leaderboard-you")?.scrollIntoView({ block: "center" });
                    return;
                  }
                  // Rank four starts the existing twenty-row pagination.
                  const playerPage = Math.max(1, Math.floor(((data.currentUser?.rank ?? 4) - 4) / 20) + 1);
                  router.push(leaderboardHref(data.scope, playerPage, currentFellowshipParameter) + "#leaderboard-you");
                }}
              >
                {t("jumpToMe")}
              </Button>
            </aside>
          )}
        </>
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
