/** Reusable, read-only Beacon progress: one lifetime XP input, shared progression rules. */
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  beaconLevelFromXp,
  beaconLevelStartXp,
} from "../constants/beacon-progression";

/**
 * Level endpoints describe the bar's range, while its overlay shows lifetime XP
 * against the next cumulative threshold. The visual fill has an owner-approved
 * intrinsic minimum so the entire pill fits, even at zero progress. Native
 * accessible progress retains the exact current-level values independently.
 * No reads, writes, timers or percentage rounding are needed by this presentation.
 */
export function BeaconLevelBar({
  lifetimeXp,
  className,
}: {
  lifetimeXp: number;
  className?: string;
}): React.ReactNode {
  const t = useTranslations("BeaconLevelBar");
  const locale = useLocale();
  const total = Number.isFinite(lifetimeXp)
    ? Math.max(0, Math.floor(lifetimeXp))
    : 0;
  const level = beaconLevelFromXp(total);
  const currentThreshold = beaconLevelStartXp(level);
  const nextThreshold = beaconLevelStartXp(level + 1);
  const remaining = nextThreshold - total;
  const segmentPercent =
    ((total - currentThreshold) / (nextThreshold - currentThreshold)) * 100;

  return (
    <section
      aria-label={t("label")}
      className={cn(
        "space-y-3 rounded-card border border-border bg-card p-4",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-xl font-bold">
          <Image
            src="/images/game-ui/beacon.png"
            alt=""
            width={32}
            height={32}
          />
          {t("level", { level })}
        </h2>
        <span className="font-action font-bold text-muted-foreground">
          {t("level", { level: level + 1 })}
        </span>
      </div>
      <div className="relative">
        <progress
          value={total - currentThreshold}
          max={nextThreshold - currentThreshold}
          aria-label={t("label")}
          aria-valuetext={t("accessibleValue", {
            total,
            target: nextThreshold,
            remaining,
            level: level + 1,
          })}
          className="sr-only"
        />
        {/* The first grid track grows with progress, but never shrinks below the
            pill's own width plus padding. This needs no measuring or client JS. */}
        <div
          aria-hidden="true"
          className="pointer-events-none grid h-8 overflow-hidden rounded-full bg-muted text-sm font-bold tabular-nums"
          style={{
            gridTemplateColumns: `minmax(max-content, ${segmentPercent}%) minmax(0, 1fr)`,
          }}
        >
          <div className="flex items-center justify-end rounded-full bg-primary p-1">
            <span className="whitespace-nowrap rounded-full bg-card px-2 text-foreground">
              {total.toLocaleString(locale)} /{" "}
              {nextThreshold.toLocaleString(locale)}
            </span>
          </div>
        </div>
      </div>
      <p className="text-right text-sm text-muted-foreground">
        {t("remaining", { count: remaining, level: level + 1 })}
      </p>
    </section>
  );
}
