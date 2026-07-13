import "server-only";

import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { waypointRepository } from "@/features/waypoints/repositories/waypoint.repository";

/** Authorizes and loads the fixed curriculum slots plus assignable verses. */
export async function getWaypointsManagementData(): Promise<{
  waypoints: Awaited<ReturnType<typeof waypointRepository.findAll>>;
  publishedVerses: Awaited<ReturnType<typeof waypointRepository.findPublishedVerses>>;
}> {
  await getAdminSession();
  const [waypoints, publishedVerses] = await Promise.all([
    waypointRepository.findAll(),
    waypointRepository.findPublishedVerses(),
  ]);
  return { waypoints, publishedVerses };
}
