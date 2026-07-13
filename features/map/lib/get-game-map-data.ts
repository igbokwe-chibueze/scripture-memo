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
 * Authorizes the map read, repairs lazy first-waypoint initialization, and
 * converts sparse progress rows into the complete learner-visible curriculum.
 */
export async function getGameMapData(): Promise<MapWaypoint[]> {
  const session = await requireServerSession();

  if (!(await authRepository.hasSelectedTranslation(session.user.id))) {
    redirect("/select-translation");
  }

  // WHY: Registration and login normally initialize progression, but map entry
  // safely retries the idempotent operation after an interrupted onboarding.
  await progressionRepository.initializeFirstWaypoint(session.user.id);
  const rows = await mapRepository.getUserMapData(session.user.id);

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

  return markCurrentMapWaypoint(waypoints);
}
