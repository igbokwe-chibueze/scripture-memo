"use client";

import { createContext, useContext, useState } from "react";
import { HeartHandshakeIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { NavigationButton } from "@/components/shared/navigation-button";
import { LunaMascot } from "@/components/shared/luna-mascot";
import styles from "@/features/player-shell/components/player-shell.module.css";

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
          className={styles.contextRail}
          aria-label={t("contextRail")}
        >
          {/* Route panels remain compact; short desktop windows may scroll
            * the whole rail so the Partner action is never clipped. */}
          <div ref={setContextTarget} className={styles.contextSlot} />

          <section className={styles.partnerCard}>
            {/* Reuse the approved raised-hoof greeting pose. Legacy asset
              * identifiers remain stable while visible copy calls her Meemo. */}
            <LunaMascot
              pose="guide"
              decorative
              sizes="220px"
              className={styles.partnerMeemo}
            />
            <span className={styles.partnerEyebrow}>
              <HeartHandshakeIcon className="size-6" aria-hidden="true" />
              {t("partner")}
            </span>
            <h2 className={styles.partnerTitle}>
              {t("becomePartner")}
            </h2>

            <NavigationButton
              href="/partner"
              pendingLabel={t("openingPartner")}
              size="sm"
              className={styles.partnerButton}
            >
              {t("learnMore")}
            </NavigationButton>
          </section>
        </aside>
      ) : null}
    </DesktopContextRailContext.Provider>
  );
}
