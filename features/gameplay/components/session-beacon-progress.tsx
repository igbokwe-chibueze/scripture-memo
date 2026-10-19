"use client";

import { useTranslations } from "next-intl";
import type { GameplaySessionData } from "../types/game-session.types";
import styles from "./session-introduction.module.css";

/**
 * Displays lifetime XP within the current level, using server-supplied bounds.
 * A contrasting unfilled track makes a partial level unmistakable in both
 * themes. This display never awards XP or derives progression from animation.
 */
export function SessionBeaconProgress({
  progress,
}: {
  progress: GameplaySessionData["beaconProgress"];
}): React.ReactNode {
  const t = useTranslations("Gameplay");
  const range = progress.nextLevelXp - progress.currentLevelStartXp;
  const earnedWithinLevel = progress.lifetimeXp - progress.currentLevelStartXp;
  const percentage = range > 0
    ? Math.min(100, Math.max(0, earnedWithinLevel / range * 100))
    : 0;
  const remaining = Math.max(0, progress.nextLevelXp - progress.lifetimeXp);
  const remainingLabel = t("beaconRemaining", {
    count: remaining,
    level: progress.level + 1,
  });

  return (
    <div className={styles.beaconCard}>
      <div className={styles.beaconLabels}>
        <span>{t("beaconLevel", { level: progress.level })}</span>
        <span className={styles.xpLabel}>{t("beaconXp", { count: progress.lifetimeXp })}</span>
      </div>
      <div
        className={styles.beaconTrack}
        role="progressbar"
        aria-label={t("beaconProgress")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percentage)}
        aria-valuetext={remainingLabel}
      >
        <div className={styles.beaconFill} style={{ width: `${percentage}%` }} />
      </div>
      <p className={styles.remainingXp}>{remainingLabel}</p>
    </div>
  );
}
