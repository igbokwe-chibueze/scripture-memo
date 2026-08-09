"use client";

import Image from "next/image";
import { createContext, useContext, useState } from "react";
import { HeartHandshakeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { NavigationButton } from "@/components/shared/navigation-button";

type DesktopContextRailContextValue = {
  /** Portal destination for the current route's optional contextual content. */
  contextTarget: HTMLDivElement | null;
};

const DesktopContextRailContext =
  createContext<DesktopContextRailContextValue | null>(null);

/** Returns the shell-owned portal target used by route-level context panels. */
export function useDesktopContextRail(): DesktopContextRailContextValue | null {
  return useContext(DesktopContextRailContext);
}

/**
 * Owns the permanent large-screen right rail for authenticated game pages.
 *
 * WHY: Route views should decide what contextual information is useful, but
 * they must not recreate the rail or its persistent Partner invitation. A DOM
 * portal lets those views fill the upper region without global state, database
 * reads, or page-specific shell variants.
 */
export function DesktopContextRailProvider({
  children,
  enabled = true,
}: Readonly<{
  children: React.ReactNode;
  enabled?: boolean;
}>): React.ReactNode {
  const [contextTarget, setContextTarget] = useState<HTMLDivElement | null>(null);
  const t = useTranslations("Navigation");

  return (
    <DesktopContextRailContext.Provider value={{ contextTarget }}>
      {children}

      {enabled ? (
        <aside
          className="fixed inset-y-0 right-0 z-30 hidden w-64 flex-col border-l border-border/70 bg-background text-foreground xl:flex"
          aria-label={t("contextRail")}
        >
          {/* WHY: Context content is intentionally bounded and visual-first.
           * The rail should never become a second scrolling page or repeat the
           * primary information already presented in the centre. */}
          <div ref={setContextTarget} className="min-h-0 flex-1 overflow-hidden" />

          <section className="border-t border-border/70 p-3">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/12 via-background to-amber-400/8 p-3">
              <div className="relative flex items-center gap-2.5">
                <Image
                  src="/images/mascot/luna/luna-encourage.png"
                  alt=""
                  width={256}
                  height={256}
                  className="size-14 shrink-0 object-contain"
                />
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 text-[0.65rem] font-black tracking-[0.12em] text-primary uppercase">
                    <HeartHandshakeIcon className="size-3.5" aria-hidden="true" />
                    {t("partner")}
                  </span>
                  <h2 className="font-heading text-base leading-tight font-black">
                    {t("becomePartner")}
                  </h2>
                </div>
              </div>

              <NavigationButton
                href="/oil-shop?tab=donations"
                pendingLabel={t("openingPartner")}
                size="sm"
                className="relative mt-2.5 w-full"
              >
                {t("learnMore")}
              </NavigationButton>
            </div>
          </section>
        </aside>
      ) : null}
    </DesktopContextRailContext.Provider>
  );
}
