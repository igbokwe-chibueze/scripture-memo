import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ConstructionIcon, MapPinnedIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { MapPositioner } from "@/features/map/components/map-positioner";

/**
 * Internal tooling must never be indexed or presented as product content, even
 * while a development server is reachable from another device on the LAN.
 */
export const metadata: Metadata = {
  title: "Map positioner | Scripture Memo",
  description: "Development-only tooling for aligning waypoint controls to map artwork.",
  robots: { index: false, follow: false },
};

/**
 * Server boundary for the local PNG waypoint-positioning tool.
 *
 * `connection()` deliberately defers the environment check to request time. If
 * the check ran during static generation, Next.js could emit a static not-found
 * shell with a successful HTTP status. Runtime evaluation guarantees production
 * requests terminate with a real 404 before the editor renders.
 *
 * The tool is independent of authentication and databases because it accepts
 * only a browser-local file and emits clipboard text with no persistence.
 */
export async function MapPositionerView(): Promise<React.ReactNode> {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();

  return (
    <main className="min-h-screen bg-linear-to-b from-background via-muted/25 to-background py-6 sm:py-10">
      <ResponsiveContainer className="space-y-6">
        <PageHeader
          eyebrow={
            <Badge variant="outline" className="gap-1.5">
              <ConstructionIcon className="size-3.5" aria-hidden="true" />
              Development only
            </Badge>
          }
          title="Trail map positioner"
          description="Choose a local PNG, align ten waypoint centers, then copy responsive percentage coordinates. Nothing is uploaded or saved automatically."
          action={<MapPinnedIcon className="size-8 text-primary" aria-hidden="true" />}
        />

        <MapPositioner />
      </ResponsiveContainer>
    </main>
  );
}
