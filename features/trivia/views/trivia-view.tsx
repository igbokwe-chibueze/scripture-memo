import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BlankFeaturePage } from "@/components/shared/blank-feature-page";

/** Private placeholder metadata; no unfinished destination is indexable. */
export const metadata: Metadata = {
  title: "Trivia | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Authenticated blank Trivia destination; no questions or rewards are invented. */
export async function TriviaView(): Promise<React.ReactNode> {
  const t = await getTranslations("HomeScreen");
  return <BlankFeaturePage title={t("trivia")} />;
}
