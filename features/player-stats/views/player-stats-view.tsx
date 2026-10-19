/** Private statistics composition: the session is the sole source of account identity. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, LockKeyholeIcon } from "lucide-react";
import { requireServerSession } from "@/lib/auth/session";
import { GAME_MODE_ORDER } from "@/lib/constants";
import { PlayerAvatar } from "@/features/profile";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { NavigationButton } from "@/components/shared/navigation-button";
import { EmptyState } from "@/components/shared/empty-state";
import { playerStatsRepository } from "../repositories/player-stats.repository";
import { playerStatsFilterSchema } from "../schemas/player-stats.schema";
import { getModeTotals, formatStatsDuration } from "../lib/stats-format";
import { calendarDate } from "../lib/activity-calendar";
import { StatsSection, StatsMetricGrid } from "../components/stats-section";
import { StatsPeriodPicker } from "../components/stats-period-picker";
import { ActivityCalendar } from "../components/activity-calendar";
import styles from "../components/player-stats.module.css";

export const metadata: Metadata = {
  title: "Your stats | Scripture Memo",
  description:
    "Your private Scripture Memo activity, learning progress and achievements.",
  robots: { index: false, follow: false },
};

/** The period is validated before read access; external account IDs are never accepted. */
export async function PlayerStatsView({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactNode> {
  const filter = playerStatsFilterSchema.parse(await searchParams);
  const session = await requireServerSession();
  const [data, t, locale, leagueName] = await Promise.all([
    playerStatsRepository.getForPlayer(session.user.id, filter.year),
    getTranslations("PlayerStats"),
    getLocale(),
    getTranslations("Leaderboard.leagues"),
  ]);
  if (!data) notFound();
  const { owner, totals } = data;
  const modes = getModeTotals(totals.modes);
  const number = (value: number): string => value.toLocaleString(locale);
  const percent = (value: number | null): string =>
    value === null
      ? "—"
      : new Intl.NumberFormat(locale, {
          style: "percent",
          maximumFractionDigits: 0,
        }).format(value);
  const day = (value: string | null): string =>
    value
      ? new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeZone: "UTC",
        }).format(calendarDate(value))
      : "—";
  const earnedBadges = totals.badges.reduce((sum, row) => sum + row.earned, 0);

  return (
    <GamePageColumns
      contextPanel={
        <aside className={`${styles.section} ${styles.rail}`}>
          <h2>{t("guideTitle")}</h2>
          <p>{t("guideCalendar")}</p>
          <p>{t("guideStreak")}</p>
          <p>{t("guideTime")}</p>
        </aside>
      }
    >
      <main className={styles.page}>
        <NavigationButton
          href={`/profiles/${owner.publicId}`}
          pendingLabel={t("opening")}
          variant="secondary"
          prefetch={false}
          className="min-h-11"
        >
          <ArrowLeftIcon aria-hidden="true" />
          {t("backProfile")}
        </NavigationButton>
        <header className={styles.hero}>
          <div className={styles.identity}>
            <PlayerAvatar
              avatarKey={owner.avatarKey}
              frameKey={owner.avatarFrameKey}
              displayName={owner.displayName}
              size="lg"
            />
            <div>
              <h1>{t("title")}</h1>
              <p>{owner.displayName}</p>
            </div>
          </div>
          <p className={styles.privacy}>
            <LockKeyholeIcon aria-hidden="true" />
            {t("private")}
          </p>
        </header>
        <StatsSection
          id="overview"
          title={t("overview")}
          description={t("lifetime")}
        >
          <StatsMetricGrid
            items={[
              {
                label: t("metrics.completedModes"),
                value: number(modes.completed),
              },
              {
                label: t("metrics.activeDays"),
                value: number(totals.activeDays),
              },
              {
                label: t("metrics.currentStreak"),
                value: number(owner.currentStreak),
              },
              {
                label: t("metrics.bestStreak"),
                value: number(owner.bestStreak),
              },
              {
                label: t("metrics.firstActivity"),
                value: day(totals.firstActiveDay),
              },
              {
                label: t("metrics.lastActivity"),
                value: day(totals.lastActiveDay),
              },
            ]}
          />
        </StatsSection>
        <StatsSection
          id="activity"
          title={t("activityTitle")}
          description={t("activityDescription")}
        >
          <StatsPeriodPicker
            key={String(data.period)}
            period={data.period}
            years={data.years}
          />
          <ActivityCalendar
            key={String(data.period)}
            days={totals.days}
            start={data.range.start}
            end={data.range.end}
            timeZone={owner.timeZone}
          />
        </StatsSection>
        {modes.completed === 0 && totals.journey.completedWaypoints === 0 && (
          <div className="mt-5">
            <EmptyState
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              variant="compact"
            />
          </div>
        )}
        <StatsSection
          id="journey"
          title={t("journeyTitle")}
          description={t("masteryRule")}
        >
          <StatsMetricGrid
            items={[
              {
                label: t("metrics.completedVerses"),
                value: number(totals.journey.completedVerses),
              },
              {
                label: t("metrics.masteredVerses"),
                value: number(totals.journey.masteredVerses),
              },
              {
                label: t("metrics.encounteredVerses"),
                value: number(totals.journey.versesEncountered),
              },
              {
                label: t("metrics.completedWaypoints"),
                value: number(totals.journey.completedWaypoints),
              },
              {
                label: t("metrics.activeWaypoints"),
                value: number(totals.journey.activeWaypoints),
              },
              {
                label: t("metrics.highestWaypoint"),
                value: number(totals.journey.highestWaypoint),
              },
              {
                label: t("metrics.booksExplored"),
                value: number(totals.journey.booksExplored),
              },
              {
                label: t("metrics.favorites"),
                value: number(totals.journey.favorites),
              },
              {
                label: t("metrics.notes"),
                value: number(totals.journey.notes),
              },
            ]}
          />
          <h3 className={styles.subheading}>{t("stagesTitle")}</h3>
          <div className={styles.rows}>
            {(["LEARN", "RECALL", "STRENGTHEN", "MASTER"] as const).map(
              (stage) => {
                const row = totals.stages.find(
                  (entry) => entry.stage === stage,
                );
                return (
                  <div key={stage} className={styles.row}>
                    <strong>{t(`stages.${stage}`)}</strong>
                    <div>
                      <span>
                        {t("completedCount", { count: row?.completed ?? 0 })}
                      </span>
                      <small>
                        {t("activeCount", { count: row?.active ?? 0 })}
                      </small>
                    </div>
                  </div>
                );
              },
            )}
          </div>
          <h3 className={styles.subheading}>{t("challengesTitle")}</h3>
          <StatsMetricGrid
            items={(["GLIMMER", "GLOW", "RADIANCE"] as const).map((level) => ({
              label: t(`levels.${level}`),
              value: number(
                totals.challenges.find((row) => row.level === level)
                  ?.completed ?? 0,
              ),
            }))}
          />
          <details className={styles.disclosure}>
            <summary>{t("booksTitle")}</summary>
            {totals.books.length ? (
              <div className={styles.rows}>
                {totals.books.map((book) => (
                  <div key={book.book} className={styles.row}>
                    <strong>{book.book}</strong>
                    <div>
                      <span>
                        {t("completedCount", { count: book.completed })}
                      </span>
                      <small>
                        {t("masteredCount", { count: book.mastered })}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.note}>{t("booksEmpty")}</p>
            )}
          </details>
        </StatsSection>
        <StatsSection
          id="gameplay"
          title={t("gameplayTitle")}
          description={t("gameplayDescription")}
        >
          <StatsMetricGrid
            items={[
              {
                label: t("metrics.completionRate"),
                value: percent(modes.completionRate),
              },
              {
                label: t("metrics.recordedTime"),
                value: formatStatsDuration(
                  modes.timedAttempts ? modes.recordedMs : null,
                  locale,
                ),
              },
              { label: t("metrics.firstTry"), value: number(modes.firstTry) },
              { label: t("metrics.failed"), value: number(modes.failed) },
              { label: t("metrics.expired"), value: number(modes.expired) },
              {
                label: t("metrics.unfinished"),
                value: number(modes.unfinished),
              },
            ]}
          />
          <p className={styles.note}>{t("guideTime")}</p>
          <div className={styles.modeGrid}>
            {GAME_MODE_ORDER.map((mode) => {
              const row = totals.modes.find((entry) => entry.mode === mode);
              const finished =
                (row?.completed ?? 0) +
                (row?.failed ?? 0) +
                (row?.expired ?? 0);
              return (
                <article key={mode} className={styles.mode}>
                  <h3>{t(`modes.${mode}`)}</h3>
                  <div className={styles.modeSummary}>
                    <span>
                      {t("completedCount", { count: row?.completed ?? 0 })}
                    </span>
                    <strong>
                      {percent(
                        finished ? (row?.completed ?? 0) / finished : null,
                      )}
                    </strong>
                  </div>
                  <progress
                    className={styles.progress}
                    value={row?.completed ?? 0}
                    max={finished || 1}
                    aria-label={t("metrics.completionRate")}
                  />
                  <dl>
                    {[
                      [t("calendar.learning"), number(row?.learning ?? 0)],
                      [t("calendar.practice"), number(row?.practice ?? 0)],
                      [t("metrics.failed"), number(row?.failed ?? 0)],
                      [t("metrics.expired"), number(row?.expired ?? 0)],
                      [t("metrics.firstTry"), number(row?.firstTry ?? 0)],
                      [t("metrics.unfinished"), number(row?.inProgress ?? 0)],
                      [
                        t("metrics.averageTime"),
                        formatStatsDuration(row?.averageMs ?? null, locale),
                      ],
                      [
                        t("metrics.fastestTime"),
                        formatStatsDuration(row?.fastestMs ?? null, locale),
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>
          <h3 className={styles.subheading}>{t("sessionsTitle")}</h3>
          <StatsMetricGrid
            items={[
              {
                label: t("metrics.learningSessions"),
                value: number(totals.sessions.learning),
                hint: t("completedCount", {
                  count: totals.sessions.finishedLearning,
                }),
              },
              {
                label: t("metrics.practiceSessions"),
                value: number(totals.sessions.practice),
                hint: t("completedCount", {
                  count: totals.sessions.finishedPractice,
                }),
              },
            ]}
          />
          {totals.translations.length > 0 && (
            <>
              <h3 className={styles.subheading}>{t("translationsTitle")}</h3>
              <div className={styles.rows}>
                {totals.translations.map((row) => (
                  <div key={row.translation} className={styles.row}>
                    <strong>{row.translation}</strong>
                    <span>{t("completedCount", { count: row.completed })}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </StatsSection>
        <StatsSection id="achievements" title={t("achievementsTitle")}>
          <StatsMetricGrid
            items={[
              {
                label: t("metrics.beaconLevel"),
                value: number(owner.beaconLevel),
              },
              { label: t("metrics.beaconXp"), value: number(owner.beaconXp) },
              { label: t("metrics.crowns"), value: number(owner.crowns) },
              {
                label: t("metrics.weeklyXp"),
                value: number(totals.beacon.weeklyXp),
              },
              {
                label: t("metrics.highestLeague"),
                value: totals.beacon.highestLeague
                  ? leagueName(totals.beacon.highestLeague)
                  : "—",
              },
              {
                label: t("metrics.finishedWeeks"),
                value: number(totals.beacon.finishedWeeks),
              },
              {
                label: t("metrics.weeklyWins"),
                value: number(totals.beacon.weeklyWins),
              },
              {
                label: t("metrics.bestRank"),
                value:
                  totals.beacon.bestRank === null
                    ? "—"
                    : `#${number(totals.beacon.bestRank)}`,
              },
              {
                label: t("metrics.earnedBadges"),
                value: number(earnedBadges),
                hint: t("badgesAvailable", { count: totals.availableBadges }),
              },
            ]}
          />
          <h3 className={styles.subheading}>{t("raritiesTitle")}</h3>
          <div className={styles.rows}>
            {(["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] as const).map(
              (rarity) => (
                <div key={rarity} className={styles.row} data-rarity={rarity}>
                  <strong>{t(`rarities.${rarity}`)}</strong>
                  <span>
                    {number(
                      totals.badges.find((row) => row.rarity === rarity)
                        ?.earned ?? 0,
                    )}
                  </span>
                </div>
              ),
            )}
          </div>
        </StatsSection>
        <StatsSection id="rewards" title={t("rewardsTitle")}>
          <StatsMetricGrid
            items={[
              {
                label: t("metrics.glowBalance"),
                value: number(owner.glowBalance),
              },
              {
                label: t("metrics.challengeGlow"),
                value: number(totals.rewards.challengeGlow),
              },
              {
                label: t("metrics.badgeGlow"),
                value: number(totals.rewards.badgeGlow),
              },
              {
                label: t("metrics.adminGlow"),
                value: number(totals.rewards.adminGlow),
              },
              {
                label: t("metrics.glowSpent"),
                value: number(totals.rewards.glowSpent),
              },
              {
                label: t("metrics.purchases"),
                value: number(totals.inventory.purchases),
              },
              {
                label: t("metrics.hintsRemaining"),
                value: number(data.hintsRemaining),
              },
              {
                label: t("metrics.purchasedHints"),
                value: number(totals.inventory.purchasedHints),
              },
              {
                label: t("metrics.hintsUsed"),
                value: number(totals.inventory.hintUses),
              },
              {
                label: t("metrics.practiceHints"),
                value: number(totals.inventory.practiceHints),
              },
              {
                label: t("metrics.ownedAvatars"),
                value: number(totals.inventory.ownedAvatars),
              },
            ]}
          />
        </StatsSection>
        <StatsSection id="connections" title={t("connectionsTitle")}>
          <StatsMetricGrid
            items={[
              {
                label: t("metrics.friends"),
                value: number(totals.social.friends),
              },
              {
                label: t("metrics.fellowships"),
                value: number(totals.social.fellowships),
              },
            ]}
          />
        </StatsSection>
      </main>
    </GamePageColumns>
  );
}
