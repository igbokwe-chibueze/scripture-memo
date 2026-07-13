import type { Metadata } from "next";
import { CompassIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { GameMap } from "@/features/map/components/game-map";
import { getGameMapData } from "@/features/map/lib/get-game-map-data";

export const metadata: Metadata = {
  title: "Game map | Scripture Memo",
  description: "Follow your private Scripture Memo learning journey.",
  robots: { index: false, follow: false },
};

/** Protected campaign composition for the expanding waypoint curriculum. */
export async function GameMapView(): Promise<React.ReactNode> {
  const waypoints = await getGameMapData();

  return (
    <main className="min-h-svh bg-linear-to-b from-amber-100/60 via-background to-primary/8 py-6 dark:from-amber-950/25 sm:py-10">
      <ResponsiveContainer size="xl" className="space-y-8">
        <PageHeader
          eyebrow="Your Scripture journey"
          title="Game map"
          description="Follow the trail one waypoint at a time. Each flame marks a completed challenge day."
        />

        {waypoints.length === 0 ? (
          <EmptyState
            icon={<CompassIcon aria-hidden="true" />}
            title="The trail is being prepared"
            description="No published waypoints are available yet. Please return after an administrator publishes the first curriculum waypoint."
          />
        ) : (
          <GameMap waypoints={waypoints} />
        )}
      </ResponsiveContainer>
    </main>
  );
}
