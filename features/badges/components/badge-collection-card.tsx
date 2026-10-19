import { useLocale, useTranslations } from "next-intl";
import { HelpCircleIcon, LockKeyholeIcon } from "lucide-react";
import { GlowGem } from "@/components/shared/game-artwork";
import { Progress } from "@/components/ui/progress";
import { getBadgeDisplayStatus, getBadgeProgressPercent } from "../lib/badge-collection";
import type { BadgeCollectionItem } from "../types/badge.types";
import styles from "./badge-collection.module.css";

/** Displays persisted earning rules/rewards; never invents badge prerequisites.
 * Hidden identity stays masked, including in headings and accessible text.
 */
export function BadgeCollectionCard({
  badge,
}: {
  badge: BadgeCollectionItem;
}): React.ReactNode {
  const t = useTranslations("Badges");
  const locale = useLocale();
  const status = getBadgeDisplayStatus(badge);
  const secret = badge.isHidden && status !== "COMPLETED";
  return (
    <article className={styles.card} data-rarity={badge.rarity} data-status={status}>
      <span className={styles.category} data-category={badge.category}>
        {t(`categoryNames.${badge.category}`)}
      </span>
      <div className={styles.art} aria-hidden="true">
        <span className={styles.emoji}>
          {secret ? <HelpCircleIcon className="size-14" /> : (badge.icon || "🏅")}
        </span>
        {status === "LOCKED" && <LockKeyholeIcon className={styles.lock} />}
      </div>
      <div className={styles.details}>
        <h3 className="font-heading font-bold">
          {secret ? t("secretBadge") : badge.name}
        </h3>
        <span className={styles.status}>
          {t(`statusNames.${status}`)}
        </span>
        <p className={styles.description}>
          {secret ? t("secretDescription") : badge.description}
        </p>
        {status === "IN_PROGRESS" && !secret && (
          <div className={styles.progressRow}>
            <Progress
              value={getBadgeProgressPercent(badge.progress, badge.targetValue)}
              aria-label={t("badgeProgress", { current: badge.progress, target: badge.targetValue })}
              className={styles.progress}
            />
            <span>{badge.progress} / {badge.targetValue}</span>
          </div>
        )}
        <p className={styles.reward}>
          <GlowGem className="size-6" />
          <span>{t("fullReward", { points: badge.rewardAmount })}</span>
        </p>
        {status === "COMPLETED" && badge.unlockedAt && (
          <time className="sr-only" dateTime={badge.unlockedAt.toISOString()}>
            {t("unlockedOn", {
              date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(badge.unlockedAt),
            })}
          </time>
        )}
      </div>
    </article>
  );
}
