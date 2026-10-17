import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HandHeartIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { requireServerSession } from "@/lib/auth/session";

/** Private placeholder metadata; payment behavior is deliberately absent. */
export const metadata: Metadata = {
  title: "Partner | Scripture Memo",
  description: "Support Scripture Memo. Donations are coming soon.",
  robots: { index: false, follow: false },
};

/** Authenticated coming-soon destination; no payment or rewards are collected. */
export async function PartnerView(): Promise<React.ReactNode> {
  await requireServerSession();
  const t = await getTranslations("PartnerSupport");
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-5 text-center font-heading text-3xl font-bold">{t("pageTitle")}</h1>
      <EmptyState
        icon={<HandHeartIcon />}
        title={t("comingSoon")}
        description={t("pageDescription")}
        action={
          <NavigationButton href="/game" pendingLabel={t("openingHome")} className="min-h-11">
            {t("back")}
          </NavigationButton>
        }
      />
    </main>
  );
}
