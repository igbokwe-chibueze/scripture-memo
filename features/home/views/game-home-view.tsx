import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  AwardIcon,
  FlameIcon,
  GemIcon,
  MapIcon,
  MapPinnedIcon,
  TrophyIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { StatCard } from "@/components/shared/stat-card";
import { JourneyStageBadge } from "@/components/shared/journey-stage-badge";
import { gameHomeRepository } from "@/features/home/repositories/game-home.repository";
import { getPlayerShellSummary } from "@/features/player-shell/lib/get-player-shell-summary";
import { getCachedUserSettings } from "@/features/settings/lib/get-cached-user-settings";
import { requireServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";

export const metadata: Metadata = {
  title: "Your journey | Scripture Memo",
  description: "Continue your Scripture Memo learning journey.",
  robots: { index: false },
};

/** Builds the authenticated landing page from one current-waypoint read. */
export async function GameHomeView(): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const [settings, playerSummary, currentWaypoint, t, locale] =
    await Promise.all([
      getCachedUserSettings(session.user.id),
      getPlayerShellSummary(),
      gameHomeRepository.getCurrentWaypoint(session.user.id),
      getTranslations("Home"),
      getLocale(),
    ]);

  if (!settings?.hasSelectedTranslation) {
    redirect("/select-translation");
  }

  const numberFormat = new Intl.NumberFormat(locale);
  const administrator = isAdmin(
    session.user.role as UserRole | null | undefined,
  );

  return (
    <main className="py-6 text-foreground sm:py-9">
      <ResponsiveContainer size="lg" className="space-y-5 sm:space-y-7">
        <header className="rounded-[2rem] border border-primary/15 bg-linear-to-br from-primary/10 via-card to-amber-400/8 p-5 shadow-sm sm:p-8">
          <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-heading text-3xl leading-tight font-bold sm:text-4xl">
            {t("welcome", { name: session.user.name ?? "" })}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            {t("ready")}
          </p>
        </header>

        <section
          className="grid grid-cols-2 gap-3 sm:gap-4"
          aria-label={t("journeySummary")}
        >
          <StatCard
            label={t("glowPoints")}
            value={numberFormat.format(playerSummary.glowPoints)}
            icon={<GemIcon className="text-amber-600 dark:text-amber-300" />}
          />
          <StatCard
            label={t("streak")}
            value={numberFormat.format(playerSummary.streakDays)}
            supportingText={t("streakDays", {
              count: playerSummary.streakDays,
            })}
            icon={<FlameIcon className="text-orange-600 dark:text-orange-300" />}
          />
        </section>

        {currentWaypoint ? (
          <section className="overflow-hidden rounded-[2rem] border border-primary/20 bg-card shadow-sm">
            <div className="flex items-start gap-4 p-5 sm:items-center sm:p-7">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary sm:size-14">
                <MapPinnedIcon className="size-6 sm:size-7" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
                  {t("currentWaypoint")}
                </p>
                <h2 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">
                  {t("waypoint", { number: currentWaypoint.number })}
                </h2>
                <p className="mt-1 truncate text-sm text-muted-foreground sm:text-base">
                  {currentWaypoint.reference}
                </p>
                <div className="mt-3">
                  <JourneyStageBadge stage={currentWaypoint.journeyStage} />
                </div>
              </div>
            </div>
            <div className="border-t border-border bg-muted/30 p-4 sm:px-7 sm:py-5">
              <NavigationButton
                href={`/game/waypoints/${currentWaypoint.id}`}
                pendingLabel={t("openingWaypoint")}
                size="lg"
                className="min-h-12 w-full rounded-xl text-base sm:w-auto sm:min-w-64"
              >
                <MapIcon data-icon="inline-start" aria-hidden="true" />
                {t("continueJourney")}
              </NavigationButton>
            </div>
          </section>
        ) : (
          <EmptyState
            icon={<MapPinnedIcon aria-hidden="true" />}
            title={t("noCurrentWaypoint")}
            description={t("noCurrentWaypointDescription")}
            action={
              <NavigationButton
                href="/game/map"
                pendingLabel={t("openingMap")}
                size="lg"
                className="min-h-12 rounded-xl"
              >
                <MapIcon data-icon="inline-start" aria-hidden="true" />
                {t("openMap")}
              </NavigationButton>
            }
          />
        )}

        <nav
          className="grid grid-cols-2 gap-3"
          aria-label={t("moreDestinations")}
        >
          <NavigationButton
            href="/leaderboard"
            pendingLabel={t("openingLeaderboard")}
            variant="outline"
            className="min-h-12 justify-start rounded-xl px-4"
          >
            <TrophyIcon data-icon="inline-start" aria-hidden="true" />
            {t("leaderboard")}
          </NavigationButton>
          <NavigationButton
            href="/vault/badges"
            pendingLabel={t("openingBadges")}
            variant="outline"
            className="min-h-12 justify-start rounded-xl px-4"
          >
            <AwardIcon data-icon="inline-start" aria-hidden="true" />
            {t("badges")}
          </NavigationButton>
          {administrator ? (
            <NavigationButton
              href="/admin"
              pendingLabel={t("openingAdmin")}
              variant="outline"
              className="col-span-2 min-h-12 justify-center rounded-xl"
            >
              {t("admin")}
            </NavigationButton>
          ) : null}
        </nav>
      </ResponsiveContainer>
    </main>
  );
}
