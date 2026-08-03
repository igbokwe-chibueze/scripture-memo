"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { FlameIcon, HomeIcon, MapIcon, SettingsIcon, ShoppingCartIcon, VaultIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/game", labelKey: "home", icon: HomeIcon, exact: true },
  { href: "/game/map", labelKey: "map", icon: MapIcon, exact: false },
  { href: "/vault", labelKey: "vault", icon: VaultIcon, exact: false },
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

  if (hidesNavigation) return children;

  return (
    <div className="min-h-dvh bg-background pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-24 xl:pl-28">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-24 flex-col border-r border-violet-300/15 bg-[#090817] px-2 py-5 text-white shadow-[12px_0_30px_rgb(5_4_15/0.16)] md:flex xl:w-28" aria-label={t("desktopPlayerNavigation")}>
        <Link href="/game" className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-300 shadow-[inset_0_0_18px_rgb(251_191_36/0.1)]" aria-label={t("scriptureMemoHome")}>
          <FlameIcon className="size-8" aria-hidden="true" />
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
                <li key={href} className={label === "Settings" ? "mt-auto" : undefined}>
                  <Link href={href} aria-current={active ? "page" : undefined} className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.68rem] font-black text-slate-400 transition-all hover:bg-white/5 hover:text-white active:translate-y-0.5 active:scale-95",
                    active && "border border-amber-300/45 bg-linear-to-b from-amber-500/25 to-orange-800/20 text-amber-300 shadow-[0_0_22px_rgb(245_158_11/0.18),0_4px_0_rgb(76_37_8/0.7)]",
                  )}>
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-violet-300/20 bg-[#090817]/98 px-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-10px_30px_rgb(5_4_15/0.4)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1">
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
                    "relative flex min-h-14 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.62rem] font-black text-slate-400 transition-all active:translate-y-0.5 active:scale-95",
                    active && "-translate-y-3 border border-amber-300/55 bg-linear-to-b from-[#5c3308] to-[#2b1606] text-amber-300 shadow-[0_0_24px_rgb(245_158_11/0.35),0_5px_0_rgb(92_43_5/0.8)]",
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
  );
}
