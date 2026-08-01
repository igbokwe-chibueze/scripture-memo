import "server-only";

import {
  CompletionStatus,
  JourneyStage,
  Prisma,
  TranslationCode,
  WaypointStatus,
} from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  VaultLibraryData,
  VaultVerseItem,
} from "@/features/vault/types/vault.types";
import { VAULT_REPLAY_DAY_LEVEL } from "@/features/vault/constants/vault-replay-rules";
import { hasCompletedEveryJourneyStage } from "@/features/vault/lib/vault-mastery";
import { calculateHintBalance } from "@/features/hints/lib/hint-balance";

const vaultTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

/** Selects the learner's preferred available text without trusting the client. */
function selectTranslation(
  translations: Array<{
    translation: TranslationCode;
    text: string;
  }>,
  preferred: TranslationCode,
): { translation: TranslationCode; text: string } | null {
  return (
    translations.find(({ translation }) => translation === preferred) ??
    translations.find(({ translation }) => translation === TranslationCode.NIV) ??
    translations[0] ??
    null
  );
}

/** Converts one authorized verse relation into the private Vault card shape. */
function mapVerse(
  verse: {
    id: string;
    reference: string;
    translations: Array<{ translation: TranslationCode; text: string }>;
    packs: Array<{ pack: { name: string; slug: string } }>;
    favorites: Array<{ userId: string }>;
  },
  preferred: TranslationCode,
): VaultVerseItem | null {
  const selected = selectTranslation(verse.translations, preferred);
  if (!selected) return null;
  return {
    verseId: verse.id,
    reference: verse.reference,
    translation: selected.translation,
    text: selected.text,
    availableTranslations: verse.translations.map(({ translation }) => translation),
    packSlugs: verse.packs.map(({ pack }) => pack.slug),
    packNames: verse.packs.map(({ pack }) => pack.name),
    isFavorite: verse.favorites.length > 0,
  };
}

const vaultVerseSelect = (userId: string) => ({
  id: true,
  reference: true,
  translations: {
    select: { translation: true, text: true },
    orderBy: { translation: "asc" as const },
  },
  packs: {
    where: { pack: { isActive: true } },
    select: { pack: { select: { name: true, slug: true } } },
  },
  favorites: {
    where: { userId },
    select: { userId: true },
  },
}) satisfies Prisma.VerseSelect;

/** Database boundary for private Vault reads and isolated replay creation. */
export const vaultRepository = {
  async getLibrary(userId: string): Promise<VaultLibraryData> {
    const [profile, streak, settings, completedProgress, favorites, activeProgress] =
      await Promise.all([
        prisma.userProfile.findUnique({
          where: { userId },
          select: {
            totalWaypointsCompleted: true,
            totalGlowPoints: true,
            totalHintsUsed: true,
          },
        }),
        prisma.userStreak.findUnique({
          where: { userId },
          select: { currentStreak: true, bestStreak: true },
        }),
        prisma.userSettings.findUnique({
          where: { userId },
          select: { preferredTranslation: true },
        }),
        prisma.userWaypointProgress.findMany({
          where: { userId, status: WaypointStatus.COMPLETED },
          select: {
            waypoint: {
              select: {
                journeyStage: true,
                verseId: true,
                verse: { select: vaultVerseSelect(userId) },
              },
            },
          },
        }),
        prisma.userFavoriteVerse.findMany({
          where: { userId },
          select: { verse: { select: vaultVerseSelect(userId) } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.userWaypointProgress.findMany({
          where: {
            userId,
            status: {
              in: [
                WaypointStatus.UNLOCKED,
                WaypointStatus.IN_PROGRESS,
                WaypointStatus.COOLDOWN,
              ],
            },
          },
          select: {
            waypointId: true,
            status: true,
            waypoint: {
              select: {
                number: true,
                journeyStage: true,
                verse: { select: { reference: true } },
                dayProgress: {
                  where: { userId, status: CompletionStatus.COMPLETED },
                  select: { id: true },
                },
              },
            },
          },
          orderBy: { waypoint: { number: "asc" } },
        }),
      ]);

    const preferred = settings?.preferredTranslation ?? TranslationCode.NIV;
    const stagesByVerse = new Map<
      string,
      {
        stages: Set<JourneyStage>;
        verse: NonNullable<
          (typeof completedProgress)[number]["waypoint"]["verse"]
        >;
      }
    >();
    completedProgress.forEach(({ waypoint }) => {
      if (!waypoint.verseId || !waypoint.verse) return;
      const existing = stagesByVerse.get(waypoint.verseId) ?? {
        stages: new Set<JourneyStage>(),
        verse: waypoint.verse,
      };
      existing.stages.add(waypoint.journeyStage);
      stagesByVerse.set(waypoint.verseId, existing);
    });

    const masteredVerses = [...stagesByVerse.values()]
      .filter(({ stages }) => hasCompletedEveryJourneyStage(stages))
      .flatMap(({ verse }) => {
        const item = mapVerse(verse, preferred);
        return item ? [item] : [];
      })
      .sort((left, right) => left.reference.localeCompare(right.reference));
    const favoriteVerses = favorites.flatMap(({ verse }) => {
      const item = mapVerse(verse, preferred);
      return item ? [item] : [];
    });
    const packs = new Map<string, string>();
    [...masteredVerses, ...favoriteVerses].forEach((verse) => {
      verse.packSlugs.forEach((slug, index) => {
        packs.set(slug, verse.packNames[index] ?? slug);
      });
    });

    const totalHintsUsed = profile?.totalHintsUsed ?? 0;

    return {
      summary: {
        completedWaypoints: profile?.totalWaypointsCompleted ?? 0,
        glowPoints: profile?.totalGlowPoints ?? 0,
        currentStreak: streak?.currentStreak ?? 0,
        bestStreak: streak?.bestStreak ?? 0,
        hintsRemaining: calculateHintBalance(totalHintsUsed),
        totalHintsUsed,
      },
      masteredVerses,
      favoriteVerses,
      inProgressWaypoints: activeProgress.flatMap(({ waypointId, status, waypoint }) =>
        waypoint.verse
          ? [{
              waypointId,
              number: waypoint.number,
              reference: waypoint.verse.reference,
              journeyStage: waypoint.journeyStage,
              status,
              completedDays: waypoint.dayProgress.length,
            }]
          : [],
      ),
      availableTranslations: [...new Set(
        [...masteredVerses, ...favoriteVerses].flatMap(
          ({ availableTranslations }) => availableTranslations,
        ),
      )].sort(),
      packs: [...packs].map(([slug, name]) => ({ slug, name })),
    };
  },

  /**
   * Creates or resumes an isolated Radiance replay after proving full mastery.
   *
   * WHY: Mastery is derived from four completed stage records owned by this
   * learner. A client-supplied verse ID can therefore never expose or replay a
   * verse that the learner has not permanently mastered.
   */
  async startReplay(
    userId: string,
    verseId: string,
    startedAt: Date,
  ): Promise<string | null> {
    return prisma.$transaction(async (transaction) => {
      const completedStages = await transaction.userWaypointProgress.findMany({
        where: {
          userId,
          status: WaypointStatus.COMPLETED,
          waypoint: { verseId },
        },
        select: { waypoint: { select: { journeyStage: true } } },
      });
      const stages = new Set(
        completedStages.map(({ waypoint }) => waypoint.journeyStage),
      );
      if (!hasCompletedEveryJourneyStage(stages)) return null;

      const active = await transaction.gameSession.findFirst({
        where: {
          userId,
          verseId,
          isVaultReplay: true,
          status: CompletionStatus.IN_PROGRESS,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (active) return active.id;

      const [verse, settings] = await Promise.all([
        transaction.verse.findUnique({
          where: { id: verseId },
          select: { translations: { select: { translation: true } } },
        }),
        transaction.userSettings.findUnique({
          where: { userId },
          select: { preferredTranslation: true },
        }),
      ]);
      if (!verse) return null;
      const preferred = settings?.preferredTranslation ?? TranslationCode.NIV;
      const available = verse.translations.map(({ translation }) => translation);
      const translation = available.includes(preferred)
        ? preferred
        : available.includes(TranslationCode.NIV)
          ? TranslationCode.NIV
          : available[0];
      if (!translation) return null;

      const session = await transaction.gameSession.create({
        data: {
          userId,
          verseId,
          dayLevel: VAULT_REPLAY_DAY_LEVEL,
          translation,
          status: CompletionStatus.IN_PROGRESS,
          isVaultReplay: true,
          startedAt,
        },
        select: { id: true },
      });
      return session.id;
    }, vaultTransactionOptions);
  },
} as const;
