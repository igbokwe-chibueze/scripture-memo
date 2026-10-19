import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BlankFeaturePage } from "@/components/shared/blank-feature-page";

/** Private placeholder metadata; no unfinished destination is indexable. */
export const metadata: Metadata = {
  title: "Bible | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Authenticated blank Bible destination approved for the Home shortcut. */
export async function BibleView(): Promise<React.ReactNode> {
  const t = await getTranslations("HomeScreen");
  return <BlankFeaturePage title={t("bible")} />;
}
