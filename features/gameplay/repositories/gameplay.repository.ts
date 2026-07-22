import "server-only";

import { CompletionStatus, type DayLevel } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { prepareDayForGameplayInTransaction } from "@/features/progression/repositories/progression.repository";
import type { GameSessionModel } from "@/lib/generated/prisma/models/GameSession";
import type { SessionReadyData } from "@/features/gameplay/types/game-session.types";

const gameplayTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

/** Database boundary for server-created gameplay sessions. */
export const gameplayRepository = {
  /**
   * Starts or resumes one campaign session atomically with day preparation.
   *
   * WHY: The progression advisory lock remains held until both the day state and
   * session commit. A database or process failure therefore cannot leave an
   * IN_PROGRESS day with no server-created session proving gameplay began.
   */
  async startSession(
    userId: string,
    waypointId: string,
    dayLevel: DayLevel,
    startedAt: Date,
  ): Promise<GameSessionModel> {
    return prisma.$transaction(async (transaction) => {
      const dayProgress = await prepareDayForGameplayInTransaction(
        transaction,
        userId,
        waypointId,
        dayLevel,
        startedAt,
      );
      const waypoint = await transaction.waypoint.findUnique({
        where: { id: waypointId },
        select: { verseId: true },
      });

      // Publication was checked inside progression. A missing verse here can
      // only indicate corrupt or concurrently altered data, so fail the entire
      // transaction instead of creating an incomplete session.
      if (!waypoint?.verseId) {
        throw new Error("Playable waypoint has no assigned verse.");
      }

      const activeSession = await transaction.gameSession.findFirst({
        where: {
          userId,
          waypointId,
          dayLevel,
          isVaultReplay: false,
          status: CompletionStatus.IN_PROGRESS,
        },
        orderBy: { createdAt: "desc" },
      });
      if (activeSession) return activeSession;

      return transaction.gameSession.create({
        data: {
          userId,
          waypointId,
          verseId: waypoint.verseId,
          dayProgressId: dayProgress.id,
          dayLevel,
          status: CompletionStatus.IN_PROGRESS,
          startedAt,
        },
      });
    }, gameplayTransactionOptions);
  },

  /** Returns only a session owned by the authenticated learner. */
  async getSessionReadyData(
    userId: string,
    sessionId: string,
  ): Promise<SessionReadyData | null> {
    return prisma.gameSession.findFirst({
      where: { id: sessionId, userId, isVaultReplay: false },
      select: {
        id: true,
        waypointId: true,
        dayLevel: true,
        status: true,
        waypoint: { select: { number: true, journeyStage: true } },
        verse: { select: { reference: true } },
      },
    });
  },
} as const;
