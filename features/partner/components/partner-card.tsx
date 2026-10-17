"use client";

import Image from "next/image";
import { HeartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { NavigationButton } from "@/components/shared/navigation-button";
import styles from "./partner-card.module.css";

/**
 * Shared donation invitation. It navigates only: no payment collection or
 * entitlement is implied while donations remain coming soon. Brand/theme
 * tokens and the shared navigation control own all interactive treatments.
 */
export function PartnerCard(): React.ReactNode {
  const t = useTranslations("PartnerSupport");
  return (
    <section className={styles.card}>
      <div className={styles.intro}>
        <div className={styles.art} aria-hidden="true">
          <Image
            src="/images/mascot/meemo/meemo-holding-heart.png"
            alt=""
            fill
            sizes="80px"
            className={styles.meemo}
          />
        </div>
        <div className={styles.copy}>
          <h2 className={styles.title}>{t("title")}</h2>
          <span className={styles.supportLine}>{t("supportLine")}</span>
        </div>
      </div>
      <NavigationButton
        href="/partner"
        target="_blank"
        rel="noopener noreferrer"
        pendingLabel={t("opening")}
        aria-label={t("donateNewTab")}
        className={styles.donate}
        shimmer
      >
        <HeartIcon aria-hidden="true" className="size-5 fill-current" />
        {t("donate")}
      </NavigationButton>
    </section>
  );
}
