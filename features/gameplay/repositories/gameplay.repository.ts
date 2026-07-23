import "server-only";

import {
  CompletionStatus,
  GameModeAttemptStatus,
  Prisma,
  TranslationCode,
  type DayLevel,
  type GameMode,
  type JourneyStage,
} from "@/lib/generated/prisma/client";
import type { GameSessionModel } from "@/lib/generated/prisma/models/GameSession";
import { prisma } from "@/lib/prisma";
import {
  GAME_MODE_ORDER,
  JOURNEY_STAGE_MODE_TIME_LIMIT_SECONDS,
} from "@/lib/constants";
import { isGameplayAnswerCorrect } from "@/features/gameplay/lib/answer-validator";
import {
  markDayCompleteInTransaction,
  prepareDayForGameplayInTransaction,
} from "@/features/progression/repositories/progression.repository";
import type {
  CompleteModeResult,
  GameModeAttemptData,
  GameplayConflictCode,
  GameplaySessionData,
} from "@/features/gameplay/types/game-session.types";

const gameplayTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

/** Trusted conflict that actions translate into stable, safe error codes. */
export class GameplayConflictError extends Error {
  constructor(readonly code: GameplayConflictCode) {
    super(code);
    this.name = "GameplayConflictError";
  }
}

/** Serializes starts and submissions for one learner-owned gameplay session. */
async function lockGameSession(
  transaction: Prisma.TransactionClient,
  sessionId: string,
): Promise<void> {
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-game-session'), hashtext(${sessionId}))`;
}

/** Returns the first incomplete mode from the immutable product order. */
function getCurrentMode(completedModes: readonly GameMode[]): GameMode | null {
  const completed = new Set<GameMode>(completedModes);
  return GAME_MODE_ORDER.find((mode) => !completed.has(mode)) ?? null;
}

/** Calculates a persisted-attempt deadline without consulting client time. */
function getAttemptExpiry(
  journeyStage: JourneyStage,
  startedAt: Date,
): Date | null {
  const seconds = JOURNEY_STAGE_MODE_TIME_LIMIT_SECONDS[journeyStage];
  return seconds === null
    ? null
    : new Date(startedAt.getTime() + seconds * 1_000);
}

/** Database boundary for server-created gameplay sessions and mode attempts. */
export const gameplayRepository = {
  /**
   * Starts or resumes one campaign session atomically with day preparation.
   *
   * WHY: The progression advisory lock remains held until both the day state and
   * session commit. A failure cannot leave an IN_PROGRESS day with no
   * server-created session proving gameplay began. Translation is snapshotted
   * here so a later preference change cannot alter the active session's answer.
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
        select: {
          verseId: true,
          verse: {
            select: {
              translations: { select: { translation: true } },
            },
          },
        },
      });

      if (!waypoint?.verseId || !waypoint.verse) {
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

      const settings = await transaction.userSettings.findUnique({
        where: { userId },
        select: { preferredTranslation: true },
      });
      const preferredTranslation =
        settings?.preferredTranslation ?? TranslationCode.NIV;
      const availableTranslations = new Set(
        waypoint.verse.translations.map(({ translation }) => translation),
      );
      const translation = availableTranslations.has(preferredTranslation)
        ? preferredTranslation
        : availableTranslations.has(TranslationCode.NIV)
          ? TranslationCode.NIV
          : waypoint.verse.translations[0]?.translation;
      if (!translation) {
        throw new Error("Playable verse has no translation.");
      }

      return transaction.gameSession.create({
        data: {
          userId,
          waypointId,
          verseId: waypoint.verseId,
          dayProgressId: dayProgress.id,
          dayLevel,
          translation,
          status: CompletionStatus.IN_PROGRESS,
          startedAt,
        },
      });
    }, gameplayTransactionOptions);
  },

  /** Returns minimal learner-owned data for the shared shell. */
  async getSessionProgress(
    userId: string,
    sessionId: string,
  ): Promise<GameplaySessionData | null> {
    const [session, settings] = await Promise.all([
      prisma.gameSession.findFirst({
        where: { id: sessionId, userId, isVaultReplay: false },
        select: {
          id: true,
          waypointId: true,
          dayLevel: true,
          translation: true,
          status: true,
          waypoint: { select: { number: true, journeyStage: true } },
          verse: {
            select: {
              reference: true,
              translations: {
                select: { translation: true, text: true },
              },
            },
          },
          attempts: {
            where: { status: GameModeAttemptStatus.COMPLETED },
            select: { gameMode: true },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
      prisma.userSettings.findUnique({
        where: { userId },
        select: { audioEnabled: true },
      }),
    ]);
    if (!session) return null;

    const translation =
      session.verse.translations.find(
        (item) => item.translation === session.translation,
      ) ?? session.verse.translations[0];
    if (!translation) return null;

    const completedModes = GAME_MODE_ORDER.filter((mode) =>
      session.attempts.some((attempt) => attempt.gameMode === mode),
    );

    return {
      id: session.id,
      waypointId: session.waypointId,
      dayLevel: session.dayLevel,
      translation: session.translation,
      status: session.status,
      waypoint: session.waypoint,
      verse: {
        reference: session.verse.reference,
        translationText: translation.text,
      },
      completedModes,
      currentMode: getCurrentMode(completedModes),
      audioEnabled: settings?.audioEnabled ?? true,
    };
  },

  /**
   * Starts or resumes the next required mode attempt under a session lock.
   *
   * Expired attempts are closed using server time before a new attempt number is
   * allocated. No client-supplied mode can skip the fixed sequence.
   */
  async startModeAttempt(
    userId: string,
    sessionId: string,
    requestedMode: GameMode,
    startedAt: Date,
  ): Promise<GameModeAttemptData> {
    return prisma.$transaction(async (transaction) => {
      await lockGameSession(transaction, sessionId);
      const session = await transaction.gameSession.findFirst({
        where: {
          id: sessionId,
          userId,
          isVaultReplay: false,
          status: CompletionStatus.IN_PROGRESS,
        },
        select: {
          waypoint: { select: { journeyStage: true } },
          attempts: {
            select: {
              id: true,
              gameMode: true,
              attemptNumber: true,
              status: true,
              startedAt: true,
            },
            orderBy: { attemptNumber: "desc" },
          },
        },
      });
      if (!session?.waypoint) {
        throw new GameplayConflictError("SESSION_UNAVAILABLE");
      }

      const completedModes = GAME_MODE_ORDER.filter((mode) =>
        session.attempts.some(
          (attempt) =>
            attempt.gameMode === mode &&
            attempt.status === GameModeAttemptStatus.COMPLETED,
        ),
      );
      const currentMode = getCurrentMode(completedModes);
      if (!currentMode) throw new GameplayConflictError("ALL_MODES_COMPLETED");
      if (requestedMode !== currentMode) {
        throw new GameplayConflictError("MODE_OUT_OF_ORDER");
      }

      const activeAttempt = session.attempts.find(
        (attempt) =>
          attempt.gameMode === currentMode &&
          attempt.status === GameModeAttemptStatus.IN_PROGRESS,
      );
      const activeExpiry = activeAttempt
        ? getAttemptExpiry(session.waypoint.journeyStage, activeAttempt.startedAt)
        : null;
      if (activeAttempt && (!activeExpiry || startedAt <= activeExpiry)) {
        return { ...activeAttempt, expiresAt: activeExpiry };
      }
      if (activeAttempt) {
        await transaction.gameModeAttempt.update({
          where: { id: activeAttempt.id },
          data: {
            status: GameModeAttemptStatus.EXPIRED,
            completedAt: startedAt,
            durationMs: startedAt.getTime() - activeAttempt.startedAt.getTime(),
          },
        });
      }

      const latestAttemptNumber = session.attempts
        .filter(({ gameMode }) => gameMode === currentMode)
        .reduce((maximum, attempt) => Math.max(maximum, attempt.attemptNumber), 0);
      const attempt = await transaction.gameModeAttempt.create({
        data: {
          gameSessionId: sessionId,
          userId,
          gameMode: currentMode,
          attemptNumber: latestAttemptNumber + 1,
          status: GameModeAttemptStatus.IN_PROGRESS,
          startedAt,
        },
      });

      return {
        id: attempt.id,
        gameMode: attempt.gameMode,
        attemptNumber: attempt.attemptNumber,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: getAttemptExpiry(
          session.waypoint.journeyStage,
          attempt.startedAt,
        ),
      };
    }, gameplayTransactionOptions);
  },

  /**
   * Validates and completes one ordered mode attempt from trusted verse data.
   *
   * Incorrect and expired submissions become terminal attempts and award
   * nothing. The final correct mode completes the day and progression inside
   * this same transaction; a partial final-mode/day state cannot commit.
   */
  async completeModeAttempt(
    userId: string,
    sessionId: string,
    attemptId: string,
    requestedMode: GameMode,
    submittedAnswer: string,
    completedAt: Date,
  ): Promise<CompleteModeResult> {
    return prisma.$transaction(async (transaction) => {
      await lockGameSession(transaction, sessionId);
      const session = await transaction.gameSession.findFirst({
        where: {
          id: sessionId,
          userId,
          isVaultReplay: false,
          status: CompletionStatus.IN_PROGRESS,
        },
        select: {
          waypointId: true,
          dayLevel: true,
          translation: true,
          waypoint: { select: { journeyStage: true } },
          verse: {
            select: {
              translations: {
                select: { translation: true, text: true },
              },
            },
          },
          attempts: {
            select: {
              id: true,
              userId: true,
              gameMode: true,
              status: true,
              startedAt: true,
            },
          },
        },
      });
      if (!session?.waypointId || !session.dayLevel || !session.waypoint) {
        throw new GameplayConflictError("SESSION_UNAVAILABLE");
      }

      const completedModes = GAME_MODE_ORDER.filter((mode) =>
        session.attempts.some(
          (attempt) =>
            attempt.gameMode === mode &&
            attempt.status === GameModeAttemptStatus.COMPLETED,
        ),
      );
      const currentMode = getCurrentMode(completedModes);
      if (!currentMode || requestedMode !== currentMode) {
        throw new GameplayConflictError("MODE_OUT_OF_ORDER");
      }

      const attempt = session.attempts.find(({ id }) => id === attemptId);
      if (
        !attempt ||
        attempt.userId !== userId ||
        attempt.gameMode !== requestedMode ||
        attempt.status !== GameModeAttemptStatus.IN_PROGRESS
      ) {
        throw new GameplayConflictError("ATTEMPT_NOT_ACTIVE");
      }

      const durationMs = Math.max(
        0,
        completedAt.getTime() - attempt.startedAt.getTime(),
      );
      const expiresAt = getAttemptExpiry(
        session.waypoint.journeyStage,
        attempt.startedAt,
      );
      if (expiresAt && completedAt > expiresAt) {
        await transaction.gameModeAttempt.update({
          where: { id: attempt.id },
          data: {
            status: GameModeAttemptStatus.EXPIRED,
            completedAt,
            durationMs,
            score: 0,
          },
        });
        return {
          status: "expired",
          gameMode: requestedMode,
          dayCompletion: null,
        };
      }

      const canonicalTranslation = session.verse.translations.find(
        ({ translation }) => translation === session.translation,
      );
      if (
        !canonicalTranslation ||
        !isGameplayAnswerCorrect(submittedAnswer, canonicalTranslation.text)
      ) {
        await transaction.gameModeAttempt.update({
          where: { id: attempt.id },
          data: {
            status: GameModeAttemptStatus.FAILED,
            completedAt,
            durationMs,
            score: 0,
          },
        });
        return {
          status: "incorrect",
          gameMode: requestedMode,
          dayCompletion: null,
        };
      }

      await transaction.gameModeAttempt.update({
        where: { id: attempt.id },
        data: {
          status: GameModeAttemptStatus.COMPLETED,
          completedAt,
          durationMs,
          score: 100,
        },
      });
      const completedAfterSubmission = [...completedModes, requestedMode];
      const nextMode = getCurrentMode(completedAfterSubmission);
      if (nextMode) {
        return {
          status: "mode-complete",
          gameMode: requestedMode,
          nextMode,
          dayCompletion: null,
        };
      }

      const dayCompletion = await markDayCompleteInTransaction(
        transaction,
        userId,
        session.waypointId,
        session.dayLevel,
        completedAt,
      );
      await transaction.gameSession.update({
        where: { id: sessionId },
        data: { status: CompletionStatus.COMPLETED, completedAt },
      });
      return {
        status: "day-complete",
        gameMode: requestedMode,
        nextMode: null,
        dayCompletion,
      };
    }, gameplayTransactionOptions);
  },
} as const;
