import "server-only";

import { redirect } from "next/navigation";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { mapRepository } from "@/features/map/repositories/map.repository";
import { getMapThemeForTrail } from "@/features/map/data/map-themes";
import { markCurrentMapWaypoint } from "@/features/map/lib/map-utils";
import type { MapWaypoint } from "@/features/map/types/map.types";
import { progressionRepository } from "@/features/progression/repositories/progression.repository";
import { requireServerSession } from "@/lib/auth/session";
import { getCachedUserSettings } from "@/features/settings/lib/get-cached-user-settings";

/**
 * Loads the complete, authorized DTO consumed by both map presentations.
 *
 * This server-only orchestration keeps identity out of client input: the user ID
 * always comes from the Better Auth session. It also enforces translation
 * onboarding before loading curriculum, retries the idempotent first-waypoint
 * initialization, and converts sparse database progress into explicit LOCKED
 * nodes without pre-creating rows for the whole expanding curriculum.
 *
 * No map preference is read here. Map A and Map B must receive exactly the same
 * server-authoritative progression snapshot so the visual comparison cannot
 * change unlock behavior.
 */
export async function getGameMapData(): Promise<MapWaypoint[]> {
  const session = await requireServerSession();

  // Translation selection is a required onboarding boundary. Redirecting here
  // protects direct URL access that may bypass the normal post-login flow.
  const settings = await getCachedUserSettings(session.user.id);
  if (!settings?.hasSelectedTranslation) {
    redirect("/select-translation");
  }

  const [initialRows, artworkAssignments] = await Promise.all([
    mapRepository.getUserMapData(session.user.id),
    mapRepository.getTrailThemeAssignments(),
  ]);
  let rows = initialRows;

  // WHY: Registration/onboarding owns normal progression initialization. The
  // map remains read-only for established learners and enters this transaction
  // only when its first read proves that an interrupted onboarding left no
  // progression anywhere. This preserves self-repair without paying for locks
  // and duplicate reads on every map visit.
  if (rows.every(({ userProgress }) => userProgress.length === 0)) {
    const recovery = await progressionRepository.initializeFirstWaypoint(
      session.user.id,
    );
    if (recovery.status === "ready") {
      rows = await mapRepository.getUserMapData(session.user.id);
    }
  }

  // Convert Prisma's nested relation arrays into a small presentation DTO. A
  // missing progress relation is expected under lazy progression and means the
  // waypoint is locked; it is not an error or missing-data condition.
  const themeByTrail = new Map(
    artworkAssignments.map(({ trailNumber, themeId }) => [trailNumber, themeId]),
  );
  const waypoints = rows.map((row, index) => {
    // Map A groups the ordered playable list in fives, so calculate artwork from
    // the same server-side order used by its trail cards and navigator previews.
    const trailNumber = Math.floor(index / 5) + 1;
    const theme = getMapThemeForTrail(
      trailNumber,
      themeByTrail.get(trailNumber),
    );

    return {
      id: row.id,
      number: row.number,
      reference: row.verse?.reference ?? "Scripture unavailable",
      journeyStage: row.journeyStage,
      status: row.userProgress[0]?.status ?? WaypointStatus.LOCKED,
      // A challenge has exactly three days, but clamping makes corrupt legacy
      // duplicates incapable of breaking the shared flame component contract.
      flameCount: Math.min(row.dayProgress.length, 3),
      trailThemeId: theme.id,
    };
  });

  // Current-node derivation runs after every status has an explicit value, so
  // both map variants highlight exactly the same learner position.
  return markCurrentMapWaypoint(waypoints);
}
