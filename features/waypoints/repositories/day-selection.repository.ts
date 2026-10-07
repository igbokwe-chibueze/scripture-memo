import "server-only";

import {
  CompletionStatus,
  GameModeAttemptStatus,
  TranslationCode,
  WaypointStatus,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { DaySelectionData } from "@/features/waypoints/types/day-selection.types";
import { getStudyAccessState } from "@/features/sanctuary/lib/study-access";

/** Read-only database boundary for one learner's Day Selection screen. */
export const daySelectionRepository = {
  /**
   * Loads only the selected published waypoint, learner progress, and preferred
   * verse translation. Other users' progress and private verse notes are never
   * selected or serialized into this personalized page.
   */
  async getDaySelectionData(
    userId: string,
    waypointId: string,
  ): Promise<DaySelectionData | null> {
    const waypoint = await prisma.waypoint.findFirst({
      where: {
        id: waypointId,
        isActive: true,
        verseId: { not: null },
        verse: { isActive: true },
      },
      select: {
        id: true,
        number: true,
        journeyStage: true,
        verse: {
          select: {
            id: true,
            reference: true,
            translations: {
              select: { translation: true, text: true },
            },
          },
        },
        userProgress: {
          where: { userId },
          select: { status: true },
          take: 1,
        },
        dayProgress: {
          where: { userId },
          select: {
            dayLevel: true,
            status: true,
            unlocksAt: true,
            glowPointsAwarded: true,
            gameSessions: {
              where: {
                userId,
                isVaultReplay: false,
                isAdminTest: false,
                status: CompletionStatus.COMPLETED,
              },
              select: {
                id: true,
                attempts: {
                  where: { status: GameModeAttemptStatus.COMPLETED },
                  select: { gameMode: true },
                  orderBy: { createdAt: "asc" },
                },
              },
              orderBy: { completedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    const progress = waypoint?.userProgress[0];
    if (!waypoint?.verse || !progress || progress.status === WaypointStatus.LOCKED) {
      return null;
    }

    const [settings, platformSettings] = await Promise.all([
      prisma.userSettings.findUnique({
        where: { userId },
        select: { preferredTranslation: true },
      }),
      prisma.platformSettings.findUnique({
        where: { id: "global" },
        select: {
          baseGlowPoints: true,
          defaultTranslation: true,
        },
      }),
    ]);
    const defaultTranslation =
      platformSettings?.defaultTranslation ?? TranslationCode.KJV;
    const preferredTranslation =
      settings?.preferredTranslation ?? defaultTranslation;
    const selectedTranslation =
      waypoint.verse.translations.find(
        ({ translation }) => translation === preferredTranslation,
      ) ??
      waypoint.verse.translations.find(
        ({ translation }) =>
          translation ===
          defaultTranslation,
      ) ??
      waypoint.verse.translations[0];
    if (!selectedTranslation) return null;

    return {
      baseGlowPoints: platformSettings?.baseGlowPoints ?? 100,
      waypointId: waypoint.id,
      verseId: waypoint.verse.id,
      waypointNumber: waypoint.number,
      reference: waypoint.verse.reference,
      journeyStage: waypoint.journeyStage,
      translation: selectedTranslation.translation,
      translationText: selectedTranslation.text,
      studyAccess: getStudyAccessState([
        { number: waypoint.number, status: progress.status },
      ]) as DaySelectionData["studyAccess"],
      dayProgress: waypoint.dayProgress.map(({ gameSessions, ...progressItem }) => ({
        ...progressItem,
        completedSessionId: gameSessions[0]?.id ?? null,
        completedModes:
          gameSessions[0]?.attempts.map(({ gameMode }) => gameMode) ?? [],
      })),
    };
  },
} as const;
