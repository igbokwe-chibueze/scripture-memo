import type { Metadata } from "next";
import { ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { NavigationButton } from "@/components/shared/navigation-button";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { MapTrailArtworkManager } from "@/features/map/components/map-trail-artwork-manager";
import {
  getMapThemeForTrail,
  isMapThemeId,
  MAP_THEMES,
} from "@/features/map/data/map-themes";
import { mapRepository } from "@/features/map/repositories/map.repository";
import type {
  MapArtworkOption,
  MapTrailArtworkRow,
} from "@/features/map/types/map.types";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Map trail artwork | Scripture Memo",
  robots: { index: false, follow: false },
};

const TRAIL_SIZE = 5;

/**
 * Builds the admin's published-trail cards from the same ordered playable
 * waypoint list as Map A. Empty assignment rows preview the original repeating
 * artwork sequence.
 */
export async function MapTrailArtworkView(): Promise<React.ReactNode> {
  await getAdminSession();
  const { waypointNumbers, artworkAssignments } =
    await mapRepository.getAdminTrailArtworkData();
  const themeByTrail = new Map(
    artworkAssignments.map(({ trailNumber, themeId }) => [trailNumber, themeId]),
  );
  const rows: MapTrailArtworkRow[] = [];

  for (let offset = 0; offset < waypointNumbers.length; offset += TRAIL_SIZE) {
    const trailNumber = rows.length + 1;
    const trailWaypointNumbers = waypointNumbers.slice(offset, offset + TRAIL_SIZE);
    const firstWaypointNumber = trailWaypointNumbers[0];
    const lastWaypointNumber = trailWaypointNumbers.at(-1);
    if (firstWaypointNumber === undefined || lastWaypointNumber === undefined) {
      continue;
    }

    const storedThemeId = themeByTrail.get(trailNumber);
    const assignedThemeId = isMapThemeId(storedThemeId) ? storedThemeId : null;
    const effectiveTheme = getMapThemeForTrail(trailNumber, storedThemeId);

    rows.push({
      trailNumber,
      firstWaypointNumber,
      lastWaypointNumber,
      waypointCount: trailWaypointNumbers.length,
      assignedThemeId,
      effectiveArtwork: {
        id: effectiveTheme.id,
        name: effectiveTheme.name,
        alt: effectiveTheme.alt,
        imageSrc: effectiveTheme.imageSrc,
      },
    });
  }

  const options: MapArtworkOption[] = MAP_THEMES.map((theme) => ({
    id: theme.id,
    name: theme.name,
    alt: theme.alt,
    imageSrc: theme.imageSrc,
  }));

  return (
    <main className="min-h-svh bg-muted/20 py-6 sm:py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow="Map A settings"
          title="Trail artwork"
          description="Choose an illustration for each published five-waypoint trail, or use the original repeating artwork sequence."
          action={
            <NavigationButton href="/admin" pendingLabel="Returning to admin">
              Back to admin
            </NavigationButton>
          }
        />

        {rows.length > 0 ? (
          <MapTrailArtworkManager rows={rows} options={options} />
        ) : (
          <EmptyState
            icon={<ImageIcon aria-hidden="true" />}
            title="No published trails yet"
            description="Publish playable waypoints first. Map artwork can be assigned once a five-waypoint trail appears on Map A."
          />
        )}
      </ResponsiveContainer>
    </main>
  );
}
