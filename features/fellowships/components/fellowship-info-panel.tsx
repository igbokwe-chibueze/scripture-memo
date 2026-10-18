/** Route-wide collective progress derived from the full loaded roster. */
import { useFormatter, useTranslations } from "next-intl";
import { GameArtwork } from "@/components/shared/game-artwork";
import { getFellowshipJourneyTotals } from "../lib/fellowship-members";
import type { FellowshipDetailData } from "../types/fellowship.types";
import styles from "./fellowship-members.module.css";

/** Stable across tabs/search/sort; the shell keeps its donation card below this summary. */
export function FellowshipInfoPanel({
  fellowship,
}: {
  fellowship: FellowshipDetailData;
}): React.ReactNode {
  const t = useTranslations("Fellowships");
  const format = useFormatter();
  const totals = getFellowshipJourneyTotals(fellowship.members);
  return (
    <section className={styles.panel} aria-labelledby="fellowship-info-title">
      <h2 id="fellowship-info-title" className="font-heading text-xl font-bold">
        {t("journeySummary.title")}
      </h2>
      <div className={styles.panelMetric}>
        <span className={styles.panelMetricIcon}>
          <GameArtwork name="beacon" className="size-8" sizes="32px" />
        </span>
        <div>
          <p className={styles.panelNumber}>{format.number(totals.lifetimeBeaconPoints)}</p>
          <p className="text-sm text-muted-foreground">{t("memberList.lifetimePoints")}</p>
        </div>
      </div>
      <div className={styles.panelMetric}>
        <span className={styles.panelMetricIcon}>
          <GameArtwork name="map" className="size-8" sizes="32px" />
        </span>
        <div>
          <p className={styles.panelNumber}>{format.number(totals.waypointsCompleted)}</p>
          <p className="text-sm text-muted-foreground">{t("completedWaypointsMetric")}</p>
        </div>
      </div>
      <p className={styles.panelScope}>
        {t("journeySummary.scope")}
      </p>
    </section>
  );
}
