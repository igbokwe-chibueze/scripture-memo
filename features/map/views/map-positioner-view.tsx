import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
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
    <main className="min-h-screen bg-linear-to-b from-background via-muted/25 to-background py-2">
      <ResponsiveContainer size="full">
        <MapPositioner />
      </ResponsiveContainer>
    </main>
  );
}
