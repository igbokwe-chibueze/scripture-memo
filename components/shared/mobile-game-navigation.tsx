"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, MapIcon, SettingsIcon, ShoppingCartIcon, VaultIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/game", label: "Home", icon: HomeIcon, exact: true },
  { href: "/game/map", label: "Map", icon: MapIcon, exact: false },
  { href: "/vault", label: "Vault", icon: VaultIcon, exact: false },
  { href: "/oil-shop", label: "Shop", icon: ShoppingCartIcon, exact: false },
  { href: "/settings", label: "Settings", icon: SettingsIcon, exact: false },
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
  const hidesNavigation = pathname.startsWith("/game/sessions/");

  if (hidesNavigation) return children;

  return (
    <div className="pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
      {children}
      <nav
        aria-label="Player navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-violet-300/20 bg-[#090817]/98 px-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-10px_30px_rgb(5_4_15/0.4)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navigationItems.map(({ href, label, icon: Icon, exact }) => {
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
