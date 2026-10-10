import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BlankFeaturePage } from "@/components/shared/blank-feature-page";

/** Placeholder metadata cannot imply a live, reward-bearing challenge. */
export const metadata: Metadata = {
  title: "Daily challenge | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Authenticated blank destination with no completion action or reward writes. */
export async function DailyChallengeView(): Promise<React.ReactNode> {
  const t = await getTranslations("HomeScreen");
  return <BlankFeaturePage title={t("dailyChallenge")} />;
}
