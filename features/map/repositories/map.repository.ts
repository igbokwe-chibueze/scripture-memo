import "server-only";

import { CompletionStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Database boundary for the learner-facing curriculum map. */
export const mapRepository = {
  /**
   * Fetches the complete published curriculum and one learner's sparse progress
   * in one batched Prisma request. Filtering the nested relations by user keeps
   * other learners' private progress out of both memory and the returned shape.
   */
  async getUserMapData(userId: string) {
    return prisma.waypoint.findMany({
      where: {
        isActive: true,
        verseId: { not: null },
        verse: { isActive: true },
      },
      select: {
        id: true,
        number: true,
        journeyStage: true,
        verse: { select: { reference: true } },
        userProgress: {
          where: { userId },
          select: { status: true },
          take: 1,
        },
        dayProgress: {
          where: { userId, status: CompletionStatus.COMPLETED },
          select: { dayLevel: true },
        },
      },
      orderBy: { number: "asc" },
    });
  },
} as const;
