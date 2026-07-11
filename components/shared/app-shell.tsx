"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { cn } from "@/lib/utils";

export type AppShellNavigationItem = {
  /** Destination for the protected navigation item. */
  href: string;
  /** Visible and accessible name for the destination. */
  label: string;
  /** Serializable icon element used consistently in mobile and desktop navigation. */
  icon: React.ReactNode;
  /** Optional compact game status such as a count or notification dot. */
  badge?: React.ReactNode;
};

export type AppShellProps = {
  /** Protected view content rendered inside the shared game frame. */
  children: React.ReactNode;
  /** Primary game destinations shown as bottom tabs and desktop navigation. */
  navigationItems: AppShellNavigationItem[];
  /** Product mark or compact brand treatment displayed in the shell header. */
  brand?: React.ReactNode;
  /** Profile, currency, or settings controls displayed in the top bar. */
  utility?: React.ReactNode;
  /** Extends the main content region for route-specific backgrounds or spacing. */
  className?: string;
};

/**
 * Frames authenticated views with mobile-game navigation rather than SaaS chrome.
 *
 * Mobile users receive reachable bottom navigation, while larger screens gain a
 * compact side rail without changing information architecture. Active state is
 * derived from the current path and always reinforced with text, not color alone.
 */
export function AppShell({
  children,
  navigationItems,
  brand,
  utility,
  className,
}: AppShellProps): React.ReactNode {
  const pathname = usePathname();

  const isActive = (href: string): boolean =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <ResponsiveContainer className="flex min-h-16 items-center justify-between gap-4">
          <div className="font-heading text-lg font-bold">{brand ?? "Scripture Memo"}</div>
          {utility && <div className="flex items-center gap-2">{utility}</div>}
        </ResponsiveContainer>
      </header>

      <div className="lg:grid lg:grid-cols-[5.5rem_1fr]">
        <nav
          aria-label="Primary game navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:border-r lg:border-t-0 lg:px-2 lg:py-4"
        >
          <ul className="mx-auto flex max-w-lg items-center justify-around gap-1 lg:flex-col lg:justify-start lg:gap-2">
            {navigationItems.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href} className="min-w-0 flex-1 lg:w-full lg:flex-none">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-[0.68rem] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:min-h-16",
                      active && "bg-primary/10 text-primary",
                    )}
                  >
                    <span className="[&_svg]:size-5" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="max-w-full truncate">{item.label}</span>
                    {item.badge && (
                      <span className="absolute right-1.5 top-1.5">{item.badge}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className={cn("min-w-0 pb-24 lg:pb-8", className)}>{children}</main>
      </div>
    </div>
  );
}
