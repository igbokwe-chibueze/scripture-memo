"use client";

import {
  CrownIcon,
  GaugeIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { LeaderboardPageData } from "@/features/leaderboard/types/leaderboard.types";

type LeaderboardContextPanelProps = {
  /** Data already loaded for the main board; this panel performs no query. */
  data: LeaderboardPageData;
};

type ContextMetricProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
};

/** Renders one compact, visual-first leaderboard metric. */
function ContextMetric({
  icon: Icon,
  label,
  value,
}: ContextMetricProps): React.ReactNode {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-3">
      <span
        className="mb-1.5 grid size-8 place-items-center rounded-lg bg-primary/12 text-primary"
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </span>
      <p className="text-[0.68rem] font-bold text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-black tabular-nums">
        {value}
      </p>
    </div>
  );
}

/**
 * Uses the desktop context rail for the signed-in player's weekly snapshot.
 *
 * WHY: These values already exist in LeaderboardPageData, so the enhanced
 * desktop experience does not add database reads. The main leaderboard remains
 * the authority; this panel is a glanceable companion, not a second dashboard.
 */
export function LeaderboardContextPanel({
  data,
}: LeaderboardContextPanelProps): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const player = data.currentUser;

  return (
    <section className="text-card-foreground">
      <div className="border-b border-border/70 p-4">
        <h2 className="font-heading text-lg font-black">{t("beaconProgress")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <ContextMetric
            icon={GaugeIcon}
            label={t("beaconLevel")}
            value={player?.beaconLevel ?? 1}
          />
          <ContextMetric
            icon={CrownIcon}
            label={t("crownsLabel")}
            value={(player?.crowns ?? 0).toLocaleString()}
          />
        </div>
      </div>
    </section>
  );
}
