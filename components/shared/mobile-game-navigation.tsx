"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { GameArtwork } from "@/components/shared/game-artwork";
import { NavigationButton } from "@/components/shared/navigation-button";
import { DesktopContextRailProvider } from "@/components/shared/desktop-context-rail";
import { PresenceHeartbeat } from "@/features/profile/components/presence-heartbeat";
import { PlayerTopBar } from "@/features/player-shell/components/player-top-bar";
import type { PlayerShellSummary } from "@/features/player-shell/types/player-shell.types";
import type { NotificationShellData } from "@/features/notifications/types/notification.types";
import { cn } from "@/lib/utils";
import styles from "@/features/player-shell/components/player-shell.module.css";

/** Keep five global destinations; Shop and Fellowship live on Home's tiles. */
const navigationItems = [
  { href: "/game", key: "home", artwork: "home", exact: true },
  { href: "/game/map", key: "map", artwork: "map", exact: false },
  { href: "/vault", key: "vault", artwork: "vault", exact: false },
  { href: "/leaderboard", key: "leaderboard", artwork: "leaderboard", exact: false },
  { href: "/settings", key: "settings", artwork: "settings", exact: false },
] as const;

/**
 * Owns the reference sidebar/mobile bar across authenticated player routes.
 * Timed gameplay keeps its intentional exit control and no global navigation.
 * Layout variables live on one ancestor so header, rail and content never drift.
 */
export function MobileGameNavigation({
  children,
  notifications,
  playerSummary,
}: Readonly<{
  children: React.ReactNode;
  notifications: NotificationShellData;
  playerSummary: PlayerShellSummary;
}>): React.ReactNode {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const hidesNavigation = pathname.startsWith("/game/sessions/");
  const hidesContextRail =
    pathname.startsWith("/admin") ||
    pathname === "/game/map" ||
    pathname.startsWith("/game/map/");

  if (hidesNavigation) {
    return (
      <>
        <PresenceHeartbeat />
        {children}
      </>
    );
  }

  /** Both navigation surfaces resolve the same active state and pending behavior. */
  const renderNavigationItems = (mobile: boolean): React.ReactNode =>
    navigationItems.map(({ href, key, artwork, exact }) => {
      const active = exact
        ? pathname === href
        : pathname === href ||
          pathname.startsWith(`${href}/`) ||
          (href === "/game/map" && pathname.startsWith("/game/waypoints/")) ||
          (href === "/vault" && pathname.startsWith("/sanctuary/"));

      return (
        <li
          key={href}
          className={key === "settings" ? styles.settingsItem : undefined}
        >
          <NavigationButton
            href={href}
            pendingLabel={t("opening")}
            variant="ghost"
            aria-label={t(key)}
            aria-current={active ? "page" : undefined}
            className={cn(
              styles.navigationItem,
              mobile && styles.mobileItem,
              active && styles.activeItem,
            )}
          >
            <GameArtwork
              name={artwork}
              className={cn(
                styles.navigationArtwork,
                key === "leaderboard" && styles.leaderboardArtwork,
              )}
              sizes="(min-width: 1280px) 64px, 40px"
            />
            <span className={mobile ? "sr-only" : undefined}>{t(key)}</span>
          </NavigationButton>
        </li>
      );
    });

  return (
    <div className={styles.frame}>
      <DesktopContextRailProvider enabled={!hidesContextRail}>
        <div className={cn(styles.shell, !hidesContextRail && styles.withContext)}>
          <PresenceHeartbeat />
          <PlayerTopBar summary={playerSummary} notifications={notifications} />
          <aside className={styles.sidebar} aria-label={t("desktopPlayerNavigation")}>
            <Link
              href="/game"
              className={styles.logo}
              aria-label={t("scriptureMemoHome")}
            >
              <Image
                src="/images/mascot/luna/luna-avatar.png"
                alt=""
                width={1254}
                height={1254}
                sizes="64px"
                className={styles.logoArtwork}
              />
              <span className={styles.logoText}>
                <span>Scripture</span>
                <span>Memo</span>
              </span>
            </Link>
            <nav className={styles.sidebarNavigation}>
              <ul>{renderNavigationItems(false)}</ul>
            </nav>
          </aside>
          <div className="min-w-0">{children}</div>
          <nav className={styles.bottomNavigation} aria-label={t("playerNavigation")}>
            <ul>{renderNavigationItems(true)}</ul>
          </nav>
        </div>
      </DesktopContextRailProvider>
    </div>
  );
}
