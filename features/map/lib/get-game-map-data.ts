import "server-only";

import { redirect } from "next/navigation";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { mapRepository } from "@/features/map/repositories/map.repository";
import { markCurrentMapWaypoint } from "@/features/map/lib/map-utils";
import type { MapWaypoint } from "@/features/map/types/map.types";
import { progressionRepository } from "@/features/progression/repositories/progression.repository";
import { requireServerSession } from "@/lib/auth/session";

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
  if (!(await authRepository.hasSelectedTranslation(session.user.id))) {
    redirect("/select-translation");
  }

  // WHY: Registration and login normally initialize progression, but map entry
  // safely retries the idempotent operation after an interrupted onboarding.
  await progressionRepository.initializeFirstWaypoint(session.user.id);
  const rows = await mapRepository.getUserMapData(session.user.id);

  // Convert Prisma's nested relation arrays into a small presentation DTO. A
  // missing progress relation is expected under lazy progression and means the
  // waypoint is locked; it is not an error or missing-data condition.
  const waypoints = rows.map((row) => ({
    id: row.id,
    number: row.number,
    reference: row.verse?.reference ?? "Scripture unavailable",
    journeyStage: row.journeyStage,
    status: row.userProgress[0]?.status ?? WaypointStatus.LOCKED,
    // A challenge has exactly three days, but clamping makes corrupt legacy
    // duplicates incapable of breaking the shared flame component contract.
    flameCount: Math.min(row.dayProgress.length, 3),
  }));

  // Current-node derivation runs after every status has an explicit value, so
  // both map variants highlight exactly the same learner position.
  return markCurrentMapWaypoint(waypoints);
}
