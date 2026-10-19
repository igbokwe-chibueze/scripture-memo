import { getTranslations } from "next-intl/server";
import { GameArtwork, GlowGem } from "@/components/shared/game-artwork";
import { NavigationButton } from "@/components/shared/navigation-button";
import { cn } from "@/lib/utils";
import styles from "./home-screen.module.css";

/**
 * Owner-approved visual placeholder linking to a blank authenticated route.
 * The illustrative bar and +20 are not persisted progress or a claimable
 * reward. There are deliberately no actions, timers, or database reads.
 */
export async function DailyChallengeCard({
  desktop = false,
}: Readonly<{ desktop?: boolean }>): Promise<React.ReactNode> {
  const t = await getTranslations("HomeScreen");

  return (
    <NavigationButton
      href="/game/daily-challenge"
      pendingLabel={t("opening")}
      variant="ghost"
      className={cn(styles.dailyCard, desktop && styles.dailyDesktop)}
      aria-label={`${t("dailyChallenge")} — ${t("placeholder")}`}
    >
      <GameArtwork
        name="dailyChallenge"
        className={styles.targetArtwork}
        sizes={desktop ? "220px" : "64px"}
      />
      <span className={styles.dailyCopy}>
        <span className={styles.dailyTitle}>{t("dailyChallenge")}</span>
        <span className={styles.dailyDescription}>{t("dailyDescription")}</span>
        <span className={styles.dailyProgress} aria-hidden="true">
          <span />
        </span>
      </span>
      <span className={styles.dailyReward} aria-hidden="true">
        <GlowGem />
        <span>+20</span>
      </span>
    </NavigationButton>
  );
}
