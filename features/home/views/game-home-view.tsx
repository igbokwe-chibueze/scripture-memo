import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PlayIcon } from "lucide-react";
import { GameArtwork } from "@/components/shared/game-artwork";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { NavigationButton } from "@/components/shared/navigation-button";
import { DailyChallengeCard } from "@/features/home/components/daily-challenge-card";
import { gameHomeRepository } from "@/features/home/repositories/game-home.repository";
import { getCachedUserSettings } from "@/features/settings/lib/get-cached-user-settings";
import { requireServerSession } from "@/lib/auth/session";
import styles from "@/features/home/components/home-screen.module.css";

/** Personalized learning content must never be indexed or added to the sitemap. */
export const metadata: Metadata = {
  title: "Your journey | Scripture Memo",
  description: "Continue your Scripture Memo learning journey.",
  robots: { index: false },
};

/** Fixed destinations reuse the original feature routes wherever they exist. */
const shortcuts = [
  { key: "bible", href: "/bible", artwork: "bibleOpen" },
  { key: "trivia", href: "/game/trivia", artwork: "trivia" },
  { key: "fellowship", href: "/fellowships", artwork: "fellowship" },
  { key: "badges", href: "/vault/badges", artwork: "badges" },
] as const;

/**
 * Composes the approved Meemo home around the learner's real current waypoint.
 * The owner-filtered read never starts a challenge, initializes progress, or
 * awards the placeholder Daily Challenge's illustrative reward.
 */
export async function GameHomeView(): Promise<React.ReactNode> {
  const session = await requireServerSession();
  const [settings, waypoint, t] = await Promise.all([
    getCachedUserSettings(session.user.id),
    gameHomeRepository.getCurrentWaypoint(session.user.id),
    getTranslations("HomeScreen"),
  ]);

  if (!settings?.hasSelectedTranslation) {
    redirect("/select-translation");
  }

  const destination = waypoint ? `/game/waypoints/${waypoint.id}` : "/game/map";
  const completedDays = Math.min(3, Math.max(0, waypoint?.completedDays ?? 0));

  return (
    <GamePageColumns contextPanel={<DailyChallengeCard desktop />}>
      <main className={styles.home}>
        <header className={styles.hero}>
          <h1 className={styles.greeting}>
            {t("greeting", { name: session.user.name })}
          </h1>
          <div className={styles.heroArtwork}>
            <span className={styles.heroOval} aria-hidden="true" />
            {/* Only the likely LCP hero is preloaded. Icons stay lazy. */}
            <Image
              src="/images/mascot/meemo/meemo-reading-bible-v3.png"
              alt={t("readingAlt")}
              width={1218}
              height={1292}
              sizes="(max-width: 767px) 95vw, (max-width: 1279px) 70vw, 580px"
              preload
              className={styles.readingMeemo}
            />
          </div>
        </header>

        <section className={styles.journeyCard} aria-label={t("currentAdventure")}>
          <div className={styles.journeyDetails}>
            <div className={styles.bibleTile}>
              <GameArtwork
                name="bibleClosed"
                className={styles.bibleArtwork}
                sizes="160px"
              />
            </div>
            <div className={styles.waypointDetails}>
              <h2 className={styles.verseTitle}>
                {waypoint?.reference ?? t("trailReady")}
              </h2>
              <p className={styles.waypointSubtitle}>
                {waypoint
                  ? t("waypointStage", {
                      number: waypoint.number,
                      stage: t(`stages.${waypoint.journeyStage}`),
                    })
                  : t("findWaypoint")}
              </p>
              <div
                className={styles.flames}
                role="img"
                aria-label={t("completedDays", { count: completedDays })}
              >
                {[0, 1, 2].map((day) => (
                  <span key={day} className={styles.flameStep}>
                    {day > 0 ? <span className={styles.flameConnector} /> : null}
                    <GameArtwork
                      name={day < completedDays ? "flameLit" : "flameUnlit"}
                      className={styles.flame}
                      sizes="52px"
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <NavigationButton
            href={destination}
            pendingLabel={t("openingAdventure")}
            size="lg"
            className={styles.continueButton}
          >
            <PlayIcon
              className="size-6 fill-current sm:size-8"
              aria-hidden="true"
            />
            {waypoint ? t("continueAdventure") : t("openMap")}
          </NavigationButton>
        </section>

        {/* Desktop portals the daily card into the shell; mobile keeps it
          * between the active journey and the four shortcut tiles. */}
        <div className={styles.mobileDaily}>
          <DailyChallengeCard />
        </div>

        <nav className={styles.shortcuts} aria-label={t("explore")}>
          {shortcuts.map(({ key, href, artwork }) => (
            <NavigationButton
              key={key}
              href={href}
              pendingLabel={t("opening")}
              className={`${styles.shortcutTile} ${styles[key]}`}
            >
              <GameArtwork
                name={artwork}
                className={styles.shortcutArtwork}
                sizes="(max-width: 767px) 80px, 140px"
              />
              <span>{t(key)}</span>
            </NavigationButton>
          ))}
        </nav>
      </main>
    </GamePageColumns>
  );
}
