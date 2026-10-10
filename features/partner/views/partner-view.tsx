import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BlankFeaturePage } from "@/components/shared/blank-feature-page";

/** Private placeholder metadata; payment behavior is deliberately absent. */
export const metadata: Metadata = {
  title: "Partner | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Authenticated blank Partner page for the approved desktop invitation. */
export async function PartnerView(): Promise<React.ReactNode> {
  const t = await getTranslations("Navigation");
  return <BlankFeaturePage title={t("partner")} />;
}
