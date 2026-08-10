"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  FlameIcon,
  GemIcon,
  HomeIcon,
  MapIcon,
  SettingsIcon,
  SparklesIcon,
  TrophyIcon,
  UsersRoundIcon,
  VaultIcon,
} from "lucide-react";
import { NotificationCenter } from "@/features/notifications/components/notification-center";
import type { NotificationShellData } from "@/features/notifications/types/notification.types";
import type { PlayerShellSummary } from "@/features/player-shell/types/player-shell.types";

type SectionIdentity = {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

/** Renders global player counters without competing with route-owned content. */
export function PlayerTopBar({
  summary,
  notifications,
}: Readonly<{
  summary: PlayerShellSummary;
  notifications: NotificationShellData;
}>): React.ReactNode {
  const pathname = usePathname();
  const locale = useLocale();
  const navigationT = useTranslations("Navigation");
  const leaderboardT = useTranslations("Leaderboard");
  const topBarT = useTranslations("PlayerTopBar");
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [locale],
  );

  const section: SectionIdentity = pathname.startsWith("/leaderboard")
    ? { label: leaderboardT("title"), icon: TrophyIcon }
    : pathname.startsWith("/game/map") || pathname.startsWith("/game/waypoints")
      ? { label: navigationT("map"), icon: MapIcon }
      : pathname.startsWith("/vault") || pathname.startsWith("/sanctuary")
        ? { label: navigationT("vault"), icon: VaultIcon }
        : pathname.startsWith("/fellowships")
          ? { label: navigationT("fellowships"), icon: UsersRoundIcon }
          : pathname.startsWith("/settings")
            ? { label: navigationT("settings"), icon: SettingsIcon }
            : { label: navigationT("home"), icon: HomeIcon };
  const SectionIcon = section.icon;

  const stats = [
    {
      label: topBarT("glowPoints"),
      value: summary.glowPoints,
      icon: GemIcon,
      className: "text-amber-500",
    },
    {
      label: topBarT("streakDays"),
      value: summary.streakDays,
      icon: FlameIcon,
      className: "text-orange-500",
    },
    {
      label: topBarT("beaconPoints"),
      value: summary.beaconPoints,
      icon: SparklesIcon,
      className: "text-violet-500",
    },
  ] as const;

  return (
    <header className="fixed top-0 right-0 left-0 z-30 h-16 border-b border-border/70 bg-card/95 text-card-foreground backdrop-blur-xl md:left-24 xl:left-48">
      <div className="flex h-full min-w-0 items-center gap-2 px-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:flex-1">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
            <SectionIcon className="size-5" aria-hidden={true} />
          </span>
          {/* WHY: Narrow phones do not have enough horizontal room for a route
           * label plus three counters and notifications. The icon communicates
           * the current section without clipping an unfinished word. */}
          <span className="hidden truncate font-heading text-sm font-black sm:inline sm:text-base">
            {section.label}
          </span>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-1.5 sm:gap-2">
          {stats.map((stat) => {
            const StatIcon = stat.icon;
            return (
              <div
                key={stat.label}
                title={`${stat.label}: ${stat.value.toLocaleString(locale)}`}
                className="flex min-h-10 min-w-0 items-center gap-1 rounded-2xl border border-border/70 bg-background px-2 sm:px-3"
              >
                <StatIcon
                  className={`size-4 shrink-0 ${stat.className}`}
                  aria-hidden="true"
                />
                <span className="text-xs font-black tabular-nums sm:text-sm">
                  {numberFormatter.format(stat.value)}
                </span>
                <span className="sr-only">{stat.label}</span>
              </div>
            );
          })}

          <NotificationCenter
            key={
              notifications.pendingLeagueResult?.id ??
              notifications.items[0]?.id ??
              "empty-notifications"
            }
            data={notifications}
          />
        </div>
      </div>
    </header>
  );
}
