import "server-only";

import { TranslationCode } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { SanctuaryReadResult } from "@/features/sanctuary/types/sanctuary.types";
import { getStudyAccessState, isStudyAvailable } from "@/features/sanctuary/lib/study-access";

/** Selects the preferred persisted translation with a deterministic fallback. */
function selectTranslation(
  translations: Array<{ translation: TranslationCode; text: string }>,
  preferred: TranslationCode,
): { translation: TranslationCode; text: string } | null {
  return (
    translations.find((item) => item.translation === preferred) ??
    translations.find((item) => item.translation === TranslationCode.KJV) ??
    translations[0] ??
    null
  );
}

/** Database boundary for learner-owned Sanctuary reads and mutations. */
export const sanctuaryRepository = {
  /** Finds the learner's current active waypoint without exposing verse content. */
  async getActiveWaypointId(userId: string, verseId: string): Promise<string | null> {
    const progress = await prisma.userWaypointProgress.findFirst({
      where: {
        userId,
        status: { in: ["UNLOCKED", "IN_PROGRESS", "COOLDOWN"] },
        waypoint: { verseId },
      },
      orderBy: { waypoint: { number: "desc" } },
      select: { waypointId: true },
    });
    return progress?.waypointId ?? null;
  },

  /** Returns devotional data only after proving this learner completed the verse. */
  async getSanctuary(userId: string, verseId: string): Promise<SanctuaryReadResult | null> {
    const [verse, settings] = await Promise.all([
      prisma.verse.findUnique({
        where: { id: verseId },
        select: {
          id: true,
          reference: true,
          reflection: true,
          tags: {
            select: {
              tag: { select: { name: true } },
            },
            orderBy: { tag: { name: "asc" } },
          },
          studySections: {
            select: {
              type: true,
              position: true,
              content: true,
            },
            orderBy: { position: "asc" },
          },
          translations: {
            select: { translation: true, text: true },
            orderBy: { translation: "asc" },
          },
          notes: {
            where: { userId },
            select: { content: true },
            take: 1,
          },
          favorites: {
            where: { userId },
            select: { userId: true },
            take: 1,
          },
          waypoints: {
            where: { userProgress: { some: { userId } } },
            select: {
              number: true,
              userProgress: {
                where: { userId },
                select: { status: true },
                take: 1,
              },
            },
          },
        },
      }),
      prisma.userSettings.findUnique({
        where: { userId },
        select: { preferredTranslation: true },
      }),
    ]);
    if (!verse) return null;

    const access = getStudyAccessState(
      verse.waypoints.flatMap((waypoint) =>
        waypoint.userProgress[0]
          ? [{ number: waypoint.number, status: waypoint.userProgress[0].status }]
          : [],
      ),
    );
    if (access === "UNAVAILABLE") return null;
    if (access === "LOCKED") {
      return { status: "locked", verseId: verse.id, reference: verse.reference };
    }

    const selected = selectTranslation(
      verse.translations,
      settings?.preferredTranslation ?? TranslationCode.KJV,
    );
    if (!selected) return null;

    return {
      status: "available",
      access,
      data: {
        verseId: verse.id,
        reference: verse.reference,
        translation: selected.translation,
        verseText: selected.text,
        reflection: verse.reflection,
        tags: verse.tags.map(({ tag }) => tag.name),
        studySections: verse.studySections,
        personalNote: verse.notes[0]?.content ?? "",
        isFavorite: verse.favorites.length > 0,
      },
    };
  },

  /** Upserts the caller's note only when completed progress grants verse access. */
  async saveNote(userId: string, verseId: string, content: string): Promise<boolean> {
    const progress = await prisma.userWaypointProgress.findMany({
      where: { userId, waypoint: { verseId } },
      select: { status: true, waypoint: { select: { number: true } } },
    });
    const access = getStudyAccessState(
      progress.map(({ status, waypoint }) => ({ status, number: waypoint.number })),
    );
    if (!isStudyAvailable(access)) return false;

    await prisma.userVerseNote.upsert({
      where: { userId_verseId: { userId, verseId } },
      create: { userId, verseId, content },
      update: { content },
    });
    return true;
  },

  /** Toggles one favorite under the same completed-progress authorization rule. */
  async toggleFavorite(userId: string, verseId: string): Promise<boolean | null> {
    return prisma.$transaction(async (transaction) => {
      const progress = await transaction.userWaypointProgress.findMany({
        where: { userId, waypoint: { verseId } },
        select: { status: true, waypoint: { select: { number: true } } },
      });
      const access = getStudyAccessState(
        progress.map(({ status, waypoint }) => ({ status, number: waypoint.number })),
      );
      if (!isStudyAvailable(access)) return null;

      const favorite = await transaction.userFavoriteVerse.findUnique({
        where: { userId_verseId: { userId, verseId } },
        select: { userId: true },
      });
      if (favorite) {
        await transaction.userFavoriteVerse.delete({
          where: { userId_verseId: { userId, verseId } },
        });
        return false;
      }

      await transaction.userFavoriteVerse.create({ data: { userId, verseId } });
      return true;
    });
  },
} as const;
