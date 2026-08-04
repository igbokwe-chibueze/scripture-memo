import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FlameIcon, LightbulbIcon, MapPinCheckIcon, SparklesIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { StatCard } from "@/components/shared/stat-card";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { getSettingsPageData } from "@/features/settings/lib/get-settings-page-data";

export const metadata: Metadata = {
  title: "Settings | Scripture Memo",
  description: "Manage your Scripture Memo profile and learning preferences.",
  robots: { index: false, follow: false },
};

/** Protected profile summary and preference-management composition. */
export async function SettingsView(): Promise<React.ReactNode> {
  const t = await getTranslations("Settings");
  const data = await getSettingsPageData();

  return (
    <main className="min-h-svh bg-linear-to-b from-primary/8 via-background to-amber-50/50 py-8 dark:to-amber-950/10">
      <ResponsiveContainer size="md" className="space-y-8">
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />

        <section aria-label={t("journeyStats")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={t("glowPoints")} value={data.stats.totalGlowPoints} icon={<SparklesIcon />} />
          <StatCard label={t("waypoints")} value={data.stats.totalWaypointsCompleted} icon={<MapPinCheckIcon />} />
          <StatCard
            label={t("currentStreak")}
            value={data.stats.currentStreak}
            supportingText={t("bestStreak", { count: data.stats.bestStreak })}
            icon={<FlameIcon />}
          />
          <StatCard label={t("hintsUsed")} value={data.stats.totalHintsUsed} icon={<LightbulbIcon />} />
        </section>

        <SettingsForm initialValues={data.formValues} />
      </ResponsiveContainer>
    </main>
  );
}
