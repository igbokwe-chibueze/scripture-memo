import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NavigationButton } from "@/components/shared/navigation-button";
import {
  AwardIcon,
  FlameIcon,
  GemIcon,
  LightbulbIcon,
  MapIcon,
  TrophyIcon,
  VaultIcon,
} from "lucide-react";
import { requireServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { ContextPanelCard } from "@/components/shared/context-panel-card";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { StatCard } from "@/components/shared/stat-card";
import { VaultLibrary } from "@/features/vault/components/vault-library";
import { VaultAdminTestingMenu } from "@/features/vault/components/vault-admin-testing-menu";
import { vaultRepository } from "@/features/vault/repositories/vault.repository";

export const metadata: Metadata = {
  title: "Vault | Scripture Memo",
  description: "Review your private Scripture mastery library and progress archive.",
  robots: { index: false, follow: false },
};

/** Loads the authenticated learner's complete private progress archive. */
export async function VaultView(): Promise<React.ReactNode> {
  const t = await getTranslations("Vault");
  const session = await requireServerSession();
  const data = await vaultRepository.getLibrary(session.user.id);
  const administrator = isAdmin(
    session.user.role as UserRole | null | undefined,
  );
  const replayFixtureVerse = data.completedVerses[0] ?? null;
  const contextualVerse =
    data.masteredVerses[0] ??
    data.completedVerses[0] ??
    data.favoriteVerses[0] ??
    null;

  return (
    <GamePageColumns
      contextPanel={
        contextualVerse ? (
          <ContextPanelCard
            icon={<VaultIcon aria-hidden="true" />}
            eyebrow={t("permanentCollection")}
            title={contextualVerse.reference}
            description={contextualVerse.text ?? t("studyLocked")}
            detail={`${t("completedStages")}: ${contextualVerse.completedStages.length}`}
            action={
              contextualVerse.studyAccess === "AVAILABLE" ? (
                <NavigationButton
                  href={`/sanctuary/${contextualVerse.verseId}`}
                  pendingLabel={t("opening")}
                  size="sm"
                  className="w-full"
                >
                  {t("study")}
                </NavigationButton>
              ) : undefined
            }
          />
        ) : (
          <ContextPanelCard
            icon={<VaultIcon aria-hidden="true" />}
            eyebrow={t("permanentCollection")}
            title={t("noActiveWaypoint")}
            description={t("emptyCompleted")}
          />
        )
      }
    >
      <main className="min-h-dvh bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <header className="overflow-hidden rounded-dialog border border-border bg-card p-6 text-card-foreground shadow-sm sm:p-9">
            <VaultIcon className="size-11 text-primary" aria-hidden="true" />
            <p className="mt-5 text-xs font-bold tracking-[0.2em] text-primary uppercase">
              {t("permanentCollection")}
            </p>
            <h1 className="mt-2 font-heading text-4xl font-bold sm:text-5xl">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("longDescription")}
            </p>
            {/* Stack touch targets at 375px; wider screens can share a row.
             * Shared navigation owns pending feedback and the approved bevel. */}
            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <NavigationButton
                href="/game/map"
                pendingLabel={t("opening")}
                variant="secondary"
                className="min-h-11"
              >
                <MapIcon className="size-4" aria-hidden="true" />
                {t("returnTrail")}
              </NavigationButton>
              <NavigationButton
                href="/vault/badges"
                pendingLabel={t("opening")}
                className="min-h-11"
              >
                <AwardIcon className="size-4" aria-hidden="true" />
                {t("badgeCollection")}
              </NavigationButton>
              {administrator && (
                <VaultAdminTestingMenu verse={replayFixtureVerse} />
              )}
            </div>
          </header>

          <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label={t("summary")}>
            <StatCard label={t("waypoints")} value={data.summary.completedWaypoints} icon={<MapIcon />} />
            <StatCard label={t("glowPoints")} value={data.summary.glowPoints} icon={<GemIcon />} />
            <StatCard label={t("currentStreak")} value={data.summary.currentStreak} icon={<FlameIcon />} />
            <StatCard label={t("bestStreak")} value={data.summary.bestStreak} icon={<TrophyIcon />} />
            <StatCard
              className="col-span-2 lg:col-span-1"
              label={t("hintsLeft")}
              value={data.summary.hintsRemaining}
              supportingText={t("hintsUsed", { count: data.summary.totalHintsUsed })}
              icon={<LightbulbIcon />}
            />
          </section>

          <div className="mt-9">
            <VaultLibrary data={data} />
          </div>
        </div>
      </main>
    </GamePageColumns>
  );
}
