import type { Metadata } from "next";
import { CompassIcon, MapPinnedIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
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
    <main className="min-h-svh bg-linear-to-b from-sky-100/70 via-background to-emerald-100/40 py-5 dark:from-sky-950/30 dark:to-emerald-950/20 sm:py-8">
      <ResponsiveContainer size="lg" className="space-y-6">
        <header className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
            <MapPinnedIcon className="size-7" aria-hidden="true" />
          </span>
          <p className="text-xs font-black tracking-[0.2em] text-emerald-700 uppercase dark:text-emerald-300">
            Your Scripture journey
          </p>
          <h1 className="mt-1 font-heading text-3xl font-black tracking-tight sm:text-4xl">
            Follow the path
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
            Complete each three-day challenge, kindle every flame, and unlock the next waypoint.
          </p>
        </header>

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
