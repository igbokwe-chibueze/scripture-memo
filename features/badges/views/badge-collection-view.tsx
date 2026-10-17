import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { ArrowLeftIcon } from "lucide-react";
import { NavigationButton } from "@/components/shared/navigation-button";
import { requireServerSession } from "@/lib/auth/session";
import { badgeRepository } from "../repositories/badge.repository";
import { BadgeCollection } from "../components/badge-collection";
import styles from "../components/badge-collection.module.css";

export const metadata: Metadata = {
  title: "Badge Collection | Scripture Memo",
  description: "Review your private Scripture Memo achievement collection.",
  robots: { index: false, follow: false },
};

/** One authenticated collection read supplies cards, controls and desktop totals. */
export async function BadgeCollectionView(): Promise<React.ReactNode> {
  const t = await getTranslations("Badges");
  const session = await requireServerSession();
  const badges = await badgeRepository.getUserBadgeProgress(session.user.id);
  const earned = badges.filter((badge) => badge.status === "COMPLETED").length;
  return (
    <main className={styles.page}>
      <NavigationButton
        href="/vault"
        pendingLabel={t("openingVault")}
        variant="secondary"
        className="min-h-11 gap-2 px-4"
      >
        <ArrowLeftIcon className="size-5" aria-hidden="true" />
        {t("backToVault")}
      </NavigationButton>
      <header className={styles.heading}>
        <Image src="/images/game-ui/badges.png" alt="" width={48} height={48} />
        <div>
          <h1 className="font-heading text-3xl font-bold sm:text-4xl">{t("title")}</h1>
          <p>{t("collectionCount", { earned, total: badges.length })}</p>
        </div>
      </header>
      <BadgeCollection badges={badges} />
    </main>
  );
}
