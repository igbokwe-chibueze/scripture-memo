import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import { getBadgeProgressPercent, getBadgeRarityCounts } from "../lib/badge-collection";
import type { BadgeCollectionItem } from "../types/badge.types";
import styles from "./badge-collection.module.css";

/** Full-collection overview reuses loaded badges; filters never change its totals. */
export function BadgeCollectionSummary({
  badges,
}: {
  badges: BadgeCollectionItem[];
}): React.ReactNode {
  const t = useTranslations("Badges");
  const earned = badges.filter((badge) => badge.status === "COMPLETED").length;
  return (
    <section className={styles.summary} aria-labelledby="badge-summary-title">
      <h2 id="badge-summary-title" className="font-heading text-xl font-bold">
        {t("collectionSummary")}
      </h2>
      <div className={styles.summaryTotals}>
        <div className={styles.totalsRow}>
          <p>
            <strong>{earned}</strong>
            <span>{t("earnedLabel")}</span>
          </p>
          <p>
            <strong>{badges.length}</strong>
            <span>{t("totalLabel")}</span>
          </p>
        </div>
        <Progress
          value={getBadgeProgressPercent(earned, badges.length)}
          aria-label={t("collectionProgress", { earned, total: badges.length })}
          className={styles.progress}
        />
      </div>
      <h3 className="font-heading text-lg font-bold">
        {t("badgeRarities")}
      </h3>
      <ul className={styles.rarityList}>
        {getBadgeRarityCounts(badges).map(({ rarity, total }) => (
          <li key={rarity} data-rarity={rarity}>
            <span className={styles.rarityDot} aria-hidden="true" />
            <span>{t(`rarityNames.${rarity}`)}</span>
            <span>{total}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
