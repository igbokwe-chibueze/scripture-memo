import "server-only";

import {
  WaypointStatus,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { GameHomeWaypoint } from "@/features/home/types/game-home.types";

/** Read-only current-waypoint lookup used by the authenticated home screen. */
export const gameHomeRepository = {
  /**
   * Selects the learner's earliest published waypoint that is still playable.
   *
   * WHY: Progression rows are created lazily, so completed historical
   * waypoints and future locked waypoints are not candidates for the resume
   * action. This one indexed, owner-filtered read selects only the current
   * waypoint's display fields and never initializes or mutates progress.
   */
  async getCurrentWaypoint(userId: string): Promise<GameHomeWaypoint | null> {
    const progress = await prisma.userWaypointProgress.findFirst({
      where: {
        userId,
        status: {
          in: [
            WaypointStatus.UNLOCKED,
            WaypointStatus.IN_PROGRESS,
            WaypointStatus.COOLDOWN,
          ],
        },
        waypoint: {
          isActive: true,
          verseId: { not: null },
          verse: { isActive: true },
        },
      },
      select: {
        waypoint: {
          select: {
            id: true,
            number: true,
            journeyStage: true,
            verse: { select: { reference: true } },
          },
        },
      },
      orderBy: { waypoint: { number: "asc" } },
    });

    const waypoint = progress?.waypoint;
    if (!waypoint?.verse) return null;

    return {
      id: waypoint.id,
      number: waypoint.number,
      journeyStage: waypoint.journeyStage,
      reference: waypoint.verse.reference,
    };
  },
} as const;
