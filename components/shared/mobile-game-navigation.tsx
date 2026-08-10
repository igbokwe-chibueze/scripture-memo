"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  MapIcon,
  SettingsIcon,
  ShoppingCartIcon,
  UsersRoundIcon,
  VaultIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PresenceHeartbeat } from "@/features/profile/components/presence-heartbeat";
import { DesktopContextRailProvider } from "@/components/shared/desktop-context-rail";

const navigationItems = [
  { href: "/game", labelKey: "home", icon: HomeIcon, exact: true },
  { href: "/game/map", labelKey: "map", icon: MapIcon, exact: false },
  { href: "/vault", labelKey: "vault", icon: VaultIcon, exact: false },
  { href: "/fellowships", labelKey: "fellowships", icon: UsersRoundIcon, exact: false },
  { href: "/oil-shop", labelKey: "shop", icon: ShoppingCartIcon, exact: false },
  { href: "/settings", labelKey: "settings", icon: SettingsIcon, exact: false },
] as const;

/**
 * Provides persistent thumb-reachable navigation on protected mobile screens.
 *
 * WHY: Active gameplay deliberately hides global navigation so an accidental
 * tap cannot abandon a timed attempt. The existing in-game exit control remains
 * the intentional way to leave a session.
 */
export function MobileGameNavigation({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactNode {
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

  return (
    <DesktopContextRailProvider enabled={!hidesContextRail}>
      <div
        className={cn(
          "min-h-dvh bg-background pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-24 xl:pl-48",
          !hidesContextRail && "xl:pr-64",
        )}
      >
      <PresenceHeartbeat />
      {/*
       * WHY: This restrained shadow separates the persistent rail from page
       * content without making it look like a heavy modal. Casting it toward
       * the centre creates the same raised-navigation language used by the
       * mobile bar below.
       */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-24 flex-col border-r border-border/70 bg-card px-2 py-5 text-card-foreground shadow-[8px_0_24px_-14px_color-mix(in_oklch,var(--foreground),transparent_68%)] md:flex xl:w-48 xl:px-3"
        aria-label={t("desktopPlayerNavigation")}
      >
        <Link
          href="/game"
          className="mx-auto grid size-14 place-items-center text-primary xl:mx-0 xl:flex xl:w-full xl:justify-start xl:gap-2 xl:px-2"
          aria-label={t("scriptureMemoHome")}
        >
          <Image
            src="/images/mascot/luna/luna-avatar.png"
            alt=""
            width={128}
            height={128}
            className="size-10 shrink-0 object-contain"
          />
          <span className="hidden text-left font-heading text-base leading-[1.05] font-black xl:inline">
            <span className="block">Scripture</span>
            <span className="block">Memo</span>
          </span>
        </Link>
        <nav className="mt-8 flex-1">
          <ul className="flex h-full flex-col gap-2">
            {navigationItems.map(({ href, labelKey, icon: Icon, exact }) => {
              const label = t(labelKey);
              const active = exact
                ? pathname === href
                : pathname === href ||
                  pathname.startsWith(`${href}/`) ||
                  (href === "/game/map" && pathname.startsWith("/game/waypoints/")) ||
                  (href === "/vault" && pathname.startsWith("/sanctuary/"));
              return (
                <li key={href} className={href === "/settings" ? "mt-auto" : undefined}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.68rem] font-black text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:translate-y-0.5 active:scale-95 xl:min-h-14 xl:flex-row xl:justify-start xl:gap-2.5 xl:px-3 xl:text-sm",
                      active &&
                        "border border-primary/40 bg-linear-to-b from-primary/20 to-primary/8 text-primary shadow-[0_4px_0_color-mix(in_oklch,var(--primary),black_48%)]",
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
      <nav
        aria-label={t("playerNavigation")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/75 bg-card/98 px-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 text-card-foreground shadow-[0_-7px_20px_-10px_color-mix(in_oklch,var(--foreground),transparent_58%)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-6 gap-1">
          {navigationItems.map(({ href, labelKey, icon: Icon, exact }) => {
            const label = t(labelKey);
            const active = exact
              ? pathname === href
              : pathname === href ||
                pathname.startsWith(`${href}/`) ||
                (href === "/game/map" && pathname.startsWith("/game/waypoints/")) ||
                (href === "/vault" && pathname.startsWith("/sanctuary/"));
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.62rem] font-black text-muted-foreground transition-all active:translate-y-0.5 active:scale-95",
                    active &&
                      "-translate-y-3 border border-primary/50 bg-linear-to-b from-primary/25 to-primary/10 text-primary shadow-[0_0_24px_color-mix(in_oklch,var(--primary),transparent_66%),0_5px_0_color-mix(in_oklch,var(--primary),black_52%)]",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      </div>
    </DesktopContextRailProvider>
  );
}
