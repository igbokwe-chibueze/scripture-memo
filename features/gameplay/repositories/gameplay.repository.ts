import "server-only";

import {
  CompletionStatus,
  DayLevel,
  GameModeAttemptStatus,
  Prisma,
  TranslationCode,
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
import { awardDayCompletionRewardInTransaction } from "@/features/rewards/repositories/reward.repository";
import { beaconRepository } from "@/features/beacon/repositories/beacon.repository";
import {
  BEACON_DAY_BONUS_XP,
  BEACON_MODE_XP,
  BEACON_WAYPOINT_BONUS_XP,
  beaconLevelStartXp,
} from "@/features/beacon/constants/beacon-progression";
import { updateStreakInTransaction } from "@/features/progression/repositories/streak.repository";
import { calculateHintBalance } from "@/features/hints/lib/hint-balance";
import type {
  CompleteModeResult,
  GameModeAttemptData,
  GameplayConflictCode,
  GameplaySessionData,
} from "@/features/gameplay/types/game-session.types";
import { evaluateBadgeProgressInTransaction } from "@/features/badges/repositories/badge.repository";

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
    const [session, settings, usedHintCount, purchasedHints, profile] = await Promise.all([
      prisma.gameSession.findFirst({
        where: { id: sessionId, userId },
        select: {
          id: true,
          waypointId: true,
          dayLevel: true,
          translation: true,
          status: true,
          isVaultReplay: true,
          waypoint: { select: { number: true, journeyStage: true } },
          verse: {
            select: {
              id: true,
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
      prisma.hintUsage.count({ where: { userId } }),
      prisma.userShopPurchase.aggregate({
        where: { userId, shopItem: { itemType: "HINT_PACK" } },
        _sum: { entitlementQuantity: true },
      }),
      prisma.userProfile.findUnique({
        where: { userId },
        select: { beaconXp: true, beaconLevel: true },
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
      isVaultReplay: session.isVaultReplay,
      waypoint: session.waypoint,
      verse: {
        id: session.verse.id,
        reference: session.verse.reference,
        translationText: translation.text,
      },
      completedModes,
      currentMode: getCurrentMode(completedModes),
      audioEnabled: settings?.audioEnabled ?? true,
      hintBalance: calculateHintBalance(
        usedHintCount,
        purchasedHints._sum.entitlementQuantity ?? 0,
      ),
      beaconProgress: {
        lifetimeXp: profile?.beaconXp ?? 0,
        level: profile?.beaconLevel ?? 1,
        currentLevelStartXp: beaconLevelStartXp(profile?.beaconLevel ?? 1),
        nextLevelXp: beaconLevelStartXp((profile?.beaconLevel ?? 1) + 1),
      },
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
          status: CompletionStatus.IN_PROGRESS,
        },
        select: {
          isVaultReplay: true,
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
      if (!session || (!session.isVaultReplay && !session.waypoint)) {
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
      const activeExpiry = activeAttempt && session.waypoint && !session.isVaultReplay
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
        expiresAt:
          session.waypoint && !session.isVaultReplay
            ? getAttemptExpiry(session.waypoint.journeyStage, attempt.startedAt)
            : null,
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
          status: CompletionStatus.IN_PROGRESS,
        },
        select: {
          waypointId: true,
          dayLevel: true,
          translation: true,
          isVaultReplay: true,
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
      if (
        !session ||
        (!session.isVaultReplay &&
          (!session.waypointId || !session.dayLevel || !session.waypoint))
      ) {
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
      const expiresAt =
        session.waypoint && !session.isVaultReplay
          ? getAttemptExpiry(session.waypoint.journeyStage, attempt.startedAt)
          : null;
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

      // WHY: Vault replay attempts prove real answers and ordered completion,
      // but never touch campaign progression, streaks, rewards, hints, or
      // cooldowns. Only the terminal replay session and its badge metric persist.
      if (session.isVaultReplay) {
        if (nextMode) {
          return {
            status: "mode-complete",
            gameMode: requestedMode,
            nextMode,
            dayCompletion: null,
            streak: null,
            badgeUnlocks: [],
            beaconProgression: null,
          };
        }
        await transaction.gameSession.update({
          where: { id: sessionId },
          data: { status: CompletionStatus.COMPLETED, completedAt },
        });
        const badgeUnlocks = await evaluateBadgeProgressInTransaction(
          transaction,
          userId,
          { type: "VAULT_REPLAY_COMPLETED" },
          completedAt,
        );
        return {
          status: "vault-complete",
          gameMode: requestedMode,
          nextMode: null,
          dayCompletion: null,
          streak: null,
          badgeUnlocks,
        };
      }

      // WHY: A streak represents the first meaningful mode completion on a
      // learner-local calendar day. The transaction-owned updater makes later
      // modes idempotent and excludes client claims and non-persisting replays.
      const streak = await updateStreakInTransaction(
        transaction,
        userId,
        completedAt,
      );
      const streakResult = {
        status: streak.status,
        currentStreak: streak.currentStreak,
        bestStreak: streak.bestStreak,
        isNewBest: streak.isNewBest,
        previousBestStreak: streak.previousBestStreak,
        levelName: streak.level.name,
        reachedNewLevel: streak.reachedNewLevel,
        forecast: streak.forecast,
        nextLevel: streak.nextLevel,
      } as const;
      const modeBadgeUnlocks = await evaluateBadgeProgressInTransaction(
        transaction,
        userId,
        { type: "MODE_COMPLETED", currentStreak: streak.currentStreak },
        completedAt,
      );
      if (nextMode) {
        const beaconProgression = await beaconRepository.awardInTransaction(
          transaction,
          {
            userId,
            amount: BEACON_MODE_XP,
            reason: `Completed ${requestedMode} mode`,
            idempotencyKey: `mode:${attempt.id}`,
            earnedAt: completedAt,
            waypointCompleted: false,
          },
        );
        return {
          status: "mode-complete",
          gameMode: requestedMode,
          nextMode,
          dayCompletion: null,
          streak: streakResult,
          badgeUnlocks: modeBadgeUnlocks,
          beaconProgression,
        };
      }

      const campaignWaypointId = session.waypointId;
      const campaignDayLevel = session.dayLevel;
      if (!campaignWaypointId || !campaignDayLevel) {
        throw new GameplayConflictError("SESSION_UNAVAILABLE");
      }
      const dayCompletion = await markDayCompleteInTransaction(
        transaction,
        userId,
        campaignWaypointId,
        campaignDayLevel,
        completedAt,
      );
      const reward = await awardDayCompletionRewardInTransaction(
        transaction,
        userId,
        campaignWaypointId,
        campaignDayLevel,
      );
      const waypointCompleted = campaignDayLevel === DayLevel.RADIANCE;
      const beaconProgression = await beaconRepository.awardInTransaction(
        transaction,
        {
          userId,
          amount:
            BEACON_MODE_XP +
            BEACON_DAY_BONUS_XP[campaignDayLevel] +
            (waypointCompleted ? BEACON_WAYPOINT_BONUS_XP : 0),
          reason: waypointCompleted
            ? `Completed ${campaignDayLevel} and waypoint`
            : `Completed ${campaignDayLevel}`,
          idempotencyKey: `mode:${attempt.id}`,
          earnedAt: completedAt,
          waypointCompleted,
        },
      );
      await transaction.gameSession.update({
        where: { id: sessionId },
        data: { status: CompletionStatus.COMPLETED, completedAt },
      });
      const dayBadgeUnlocks = await evaluateBadgeProgressInTransaction(
        transaction,
        userId,
        { type: "DAY_COMPLETED" },
        completedAt,
      );
      const finalReward =
        dayBadgeUnlocks.length > 0
          ? {
              ...reward,
              balance:
                dayBadgeUnlocks[dayBadgeUnlocks.length - 1]?.balance ??
                reward.balance,
            }
          : reward;
      return {
        status: "day-complete",
        gameMode: requestedMode,
        nextMode: null,
        dayCompletion: { ...dayCompletion, reward: finalReward },
        streak: streakResult,
        badgeUnlocks: [...modeBadgeUnlocks, ...dayBadgeUnlocks],
        beaconProgression,
      };
    }, gameplayTransactionOptions);
  },
} as const;
