import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CompassIcon, MapPinnedIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { GameMap } from "@/features/map/components/game-map";
import { getGameMapData } from "@/features/map/lib/get-game-map-data";

/**
 * Private metadata prevents a personalized progress page from being indexed or
 * included in public search results. No learner data is embedded in metadata.
 */
export const metadata: Metadata = {
  title: "Game map | Scripture Memo",
  description: "Follow your private Scripture Memo learning journey.",
  robots: { index: false, follow: false },
};

/**
 * Protected server composition for the expanding waypoint curriculum.
 *
 * Data is loaded before crossing into the interactive client boundary, keeping
 * authentication and Prisma access on the server. The empty state distinguishes
 * a valid account with no published curriculum from a loading or error state;
 * route-level loading and error files handle those other cases.
 */
export async function GameMapView(): Promise<React.ReactNode> {
  const t = await getTranslations("Map");
  const waypoints = await getGameMapData();

  return (
    <main className="min-h-svh bg-background py-5 sm:py-8">
      <ResponsiveContainer size="lg" className="space-y-6">
        <header className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <MapPinnedIcon className="size-7" aria-hidden="true" />
          </span>
          <p className="text-xs font-bold tracking-[0.2em] text-success-text uppercase dark:text-success-text">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
            {t("description")}
          </p>
        </header>

        {waypoints.length === 0 ? (
          <EmptyState
            icon={<CompassIcon aria-hidden="true" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <GameMap waypoints={waypoints} />
        )}
      </ResponsiveContainer>
    </main>
  );
}
