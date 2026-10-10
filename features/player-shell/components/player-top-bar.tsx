"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { GameArtwork, GlowGem } from "@/components/shared/game-artwork";
import { NavigationButton } from "@/components/shared/navigation-button";
import { NotificationCenter } from "@/features/notifications";
import { PlayerAvatar } from "@/features/profile";
import type { NotificationShellData } from "@/features/notifications/types/notification.types";
import type { PlayerShellSummary } from "@/features/player-shell/types/player-shell.types";
import styles from "./player-shell.module.css";

/** Fixed labels keep route identity separate from learner-sensitive counters. */
const sections = [
  { prefix: "/leaderboard", key: "leaderboard", artwork: "leaderboard" },
  { prefix: "/game/map", key: "map", artwork: "map" },
  { prefix: "/game/waypoints", key: "map", artwork: "map" },
  { prefix: "/vault", key: "vault", artwork: "vault" },
  { prefix: "/sanctuary", key: "vault", artwork: "vault" },
  { prefix: "/fellowships", key: "fellowships", artwork: "fellowship" },
  { prefix: "/oil-shop", key: "shop", artwork: "shop" },
  { prefix: "/settings", key: "settings", artwork: "settings" },
  { prefix: "/bible", key: "bible", artwork: "bibleOpen" },
  { prefix: "/game/trivia", key: "trivia", artwork: "trivia" },
  { prefix: "/game/daily-challenge", key: "dailyChallenge", artwork: "dailyChallenge" },
  { prefix: "/partner", key: "partner", artwork: "home" },
] as const;

/**
 * Renders real counters, the selected avatar, and the existing persistent inbox.
 * No client polling or new identity endpoint is needed: the request-cached shell
 * query already returns the minimal public presentation fields for this user.
 */
export function PlayerTopBar({
  summary,
  notifications,
}: Readonly<{
  summary: PlayerShellSummary;
  notifications: NotificationShellData;
}>): React.ReactNode {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Navigation");
  const topBarT = useTranslations("PlayerTopBar");
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }),
    [locale],
  );
  const section = sections.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const stats = [
    { label: topBarT("glowPoints"), value: summary.glowPoints, artwork: null },
    { label: topBarT("streakDays"), value: summary.streakDays, artwork: "flameLit" },
    { label: topBarT("beaconPoints"), value: summary.beaconPoints, artwork: "beacon" },
  ] as const;

  return (
    <header className={styles.topBar}>
      <div className={styles.sectionIdentity}>
        <span className={styles.sectionArtwork}>
          <GameArtwork
            name={section?.artwork ?? "home"}
            className="size-9"
            sizes="36px"
          />
        </span>
        <span>{t(section?.key ?? "home")}</span>
      </div>
      <div className={styles.counters}>
        <NavigationButton
          href="/settings"
          pendingLabel={t("opening")}
          variant="ghost"
          aria-label={topBarT("openProfile", { name: summary.displayName ?? "" })}
          className={styles.avatarButton}
        >
          <PlayerAvatar
            avatarKey={summary.avatarKey ?? null}
            frameKey={summary.avatarFrameKey ?? null}
            displayName={summary.displayName ?? ""}
            size="sm"
            className={styles.playerAvatar}
          />
        </NavigationButton>
        {stats.map(({ label, value, artwork }) => (
          <div
            key={label}
            className={styles.counter}
            title={`${label}: ${value.toLocaleString(locale)}`}
          >
            {artwork ? (
              <GameArtwork
                name={artwork}
                className={styles.counterArtwork}
                sizes="40px"
              />
            ) : (
              <GlowGem className={styles.counterArtwork} />
            )}
            <span className={styles.counterValue}>{numberFormatter.format(value)}</span>
            <span className="sr-only">{label}</span>
          </div>
        ))}
        <NotificationCenter
          key={notifications.pendingLeagueResult?.id ?? notifications.items[0]?.id ?? "empty-notifications"}
          data={notifications}
        />
      </div>
    </header>
  );
}
