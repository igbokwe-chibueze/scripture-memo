import type { Metadata } from "next";
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
  const data = await getSettingsPageData();

  return (
    <main className="min-h-svh bg-linear-to-b from-primary/8 via-background to-amber-50/50 py-8 dark:to-amber-950/10">
      <ResponsiveContainer size="md" className="space-y-8">
        <PageHeader
          eyebrow="Your account"
          title="Profile & settings"
          description="Shape how Scripture Memo looks, sounds, and supports your learning journey."
        />

        <section aria-label="Your journey statistics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Glow Points" value={data.stats.totalGlowPoints} icon={<SparklesIcon />} />
          <StatCard label="Waypoints" value={data.stats.totalWaypointsCompleted} icon={<MapPinCheckIcon />} />
          <StatCard
            label="Current streak"
            value={data.stats.currentStreak}
            supportingText={`Best: ${data.stats.bestStreak}`}
            icon={<FlameIcon />}
          />
          <StatCard label="Hints used" value={data.stats.totalHintsUsed} icon={<LightbulbIcon />} />
        </section>

        <SettingsForm initialValues={data.formValues} />
      </ResponsiveContainer>
    </main>
  );
}
