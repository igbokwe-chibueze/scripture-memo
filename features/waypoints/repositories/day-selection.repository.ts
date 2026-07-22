import "server-only";

import { TranslationCode, WaypointStatus } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { DaySelectionData } from "@/features/waypoints/types/day-selection.types";

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
          select: { dayLevel: true, status: true, unlocksAt: true },
        },
      },
    });
    const progress = waypoint?.userProgress[0];
    if (!waypoint?.verse || !progress || progress.status === WaypointStatus.LOCKED) {
      return null;
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { preferredTranslation: true },
    });
    const preferredTranslation = settings?.preferredTranslation ?? TranslationCode.NIV;
    const selectedTranslation =
      waypoint.verse.translations.find(
        ({ translation }) => translation === preferredTranslation,
      ) ??
      waypoint.verse.translations.find(
        ({ translation }) => translation === TranslationCode.NIV,
      ) ??
      waypoint.verse.translations[0];
    if (!selectedTranslation) return null;

    return {
      waypointId: waypoint.id,
      waypointNumber: waypoint.number,
      reference: waypoint.verse.reference,
      journeyStage: waypoint.journeyStage,
      translation: selectedTranslation.translation,
      translationText: selectedTranslation.text,
      dayProgress: waypoint.dayProgress,
    };
  },
} as const;
