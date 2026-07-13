import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { WaypointManager } from "@/features/waypoints/components/waypoint-manager";
import { getWaypointsManagementData } from "@/features/waypoints/lib/get-waypoints-management-data";

export const metadata: Metadata = {
  title: "Manage waypoints | Scripture Memo",
  robots: { index: false, follow: false },
};

/** ADMIN-only composition for the fixed 220-waypoint curriculum. */
export async function WaypointsManagementView(): Promise<React.ReactNode> {
  const { waypoints, publishedVerses } = await getWaypointsManagementData();
  const managerKey = waypoints.map(({ id, number, verseId, journeyStage, isActive }) => `${id}:${number}:${verseId}:${journeyStage}:${isActive}`).join("|");

  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="Waypoint curriculum"
          description="Assign published Scripture, define each appearance's Journey Stage, control visibility, and maintain the 220-slot learning order."
        />
        {waypoints.length === 0 ? (
          <EmptyState title="No waypoint slots" description="Run the documented Prisma seed to create the 220 hidden curriculum placeholders." />
        ) : (
          <WaypointManager key={managerKey} initialWaypoints={waypoints} publishedVerses={publishedVerses} />
        )}
      </ResponsiveContainer>
    </main>
  );
}
