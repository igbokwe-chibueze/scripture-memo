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
import { getStudyAccessState, isStudyAvailable } from "@/features/sanctuary/lib/study-access";

const vaultTransactionOptions = { maxWait: 10_000, timeout: 60_000 } as const;

/** Selects the learner's preferred available text without trusting the client. */
function selectTranslation(
  translations: Array<{
    translation: TranslationCode;
    text: string;
  }>,
  preferred: TranslationCode,
  fallback: TranslationCode,
): { translation: TranslationCode; text: string } | null {
  return (
    translations.find(({ translation }) => translation === preferred) ??
    translations.find(({ translation }) => translation === fallback) ??
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
    notes: Array<{ content: string }>;
    waypoints: Array<{
      number: number;
      journeyStage: JourneyStage;
      userProgress: Array<{ status: WaypointStatus }>;
    }>;
  },
  preferred: TranslationCode,
  fallback: TranslationCode,
): VaultVerseItem | null {
  const selected = selectTranslation(verse.translations, preferred, fallback);
  if (!selected) return null;
  const studyState = getStudyAccessState(
    verse.waypoints.flatMap((waypoint) =>
      waypoint.userProgress[0]
        ? [{ number: waypoint.number, status: waypoint.userProgress[0].status }]
        : [],
    ),
  );
  const studyAvailable = isStudyAvailable(studyState);
  return {
    verseId: verse.id,
    reference: verse.reference,
    translation: selected.translation,
    text: studyAvailable ? selected.text : null,
    availableTranslations: verse.translations.map(({ translation }) => translation),
    packSlugs: verse.packs.map(({ pack }) => pack.slug),
    packNames: verse.packs.map(({ pack }) => pack.name),
    isFavorite: verse.favorites.length > 0,
    hasPersonalNote: Boolean(verse.notes[0]?.content.trim()),
    completedStages: verse.waypoints.flatMap(({ journeyStage, userProgress }) =>
      userProgress[0]?.status === WaypointStatus.COMPLETED ? [journeyStage] : [],
    ),
    studyAccess: studyAvailable ? "AVAILABLE" : "LOCKED",
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
  notes: {
    where: { userId },
    select: { content: true },
    take: 1,
  },
  waypoints: {
    where: {
      userProgress: {
        some: { userId },
      },
    },
    select: {
      number: true,
      journeyStage: true,
      userProgress: {
        where: { userId },
        select: { status: true },
        take: 1,
      },
    },
    orderBy: { number: "asc" as const },
  },
}) satisfies Prisma.VerseSelect;

/** Database boundary for private Vault reads and isolated replay creation. */
export const vaultRepository = {
  /** Reads only owned collection verses and the settings needed to select text.
   * One verse query replaces overlapping completed/favorite/active reads and
   * drops obsolete hint/stat queries. mapVerse redacts text before serialization.
   */
  async getLibrary(userId: string): Promise<VaultLibraryData> {
    const [verses, settings, platformSettings] = await Promise.all([
      prisma.verse.findMany({
        where: {
          OR: [
            { favorites: { some: { userId } } },
            { waypoints: { some: { userProgress: { some: { userId } } } } },
          ],
        },
        select: vaultVerseSelect(userId),
        orderBy: { reference: "asc" },
      }),
      prisma.userSettings.findUnique({
        where: { userId },
        select: { preferredTranslation: true },
      }),
      prisma.platformSettings.findUnique({
        where: { id: "global" },
        select: { defaultTranslation: true },
      }),
    ]);
    const fallback = platformSettings?.defaultTranslation ?? TranslationCode.KJV;
    const preferred = settings?.preferredTranslation ?? fallback;
    const items = verses.flatMap((verse) => {
      const item = mapVerse(verse, preferred, fallback);
      return item ? [item] : [];
    });
    return {
      completedVerses: items.filter((verse) => verse.completedStages.includes(JourneyStage.LEARN)),
      masteredVerses: items.filter((verse) =>
        hasCompletedEveryJourneyStage(new Set(verse.completedStages)),
      ),
      favoriteVerses: items.filter((verse) => verse.isFavorite),
      inProgressVerses: items.filter((verse) => !verse.completedStages.includes(JourneyStage.LEARN)),
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
      const verseProgress = await transaction.userWaypointProgress.findMany({
        where: {
          userId,
          waypoint: { verseId },
        },
        select: {
          status: true,
          waypoint: { select: { number: true, journeyStage: true } },
        },
      });
      const studyAccess = getStudyAccessState(
        verseProgress.map(({ status, waypoint }) => ({
          status,
          number: waypoint.number,
        })),
      );
      if (!isStudyAvailable(studyAccess)) return null;
      const stages = new Set(
        verseProgress.flatMap(({ status, waypoint }) =>
          status === WaypointStatus.COMPLETED ? [waypoint.journeyStage] : [],
        ),
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

      const [verse, settings, platformSettings] = await Promise.all([
        transaction.verse.findUnique({
          where: { id: verseId },
          select: { translations: { select: { translation: true } } },
        }),
        transaction.userSettings.findUnique({
          where: { userId },
          select: { preferredTranslation: true },
        }),
        transaction.platformSettings.findUnique({
          where: { id: "global" },
          select: { defaultTranslation: true },
        }),
      ]);
      if (!verse) return null;
      const preferred =
        settings?.preferredTranslation ??
        platformSettings?.defaultTranslation ??
        TranslationCode.KJV;
      const fallback =
        platformSettings?.defaultTranslation ?? TranslationCode.KJV;
      const available = verse.translations.map(({ translation }) => translation);
      const translation = available.includes(preferred)
        ? preferred
        : available.includes(fallback)
          ? fallback
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

  /**
   * Starts a no-progress Vault fixture for an administrator's completed verse.
   *
   * WHY: QA must exercise the real five-mode replay without creating artificial
   * mastery. The completed-progress predicate still prevents arbitrary verse
   * access, while the two session flags suppress every reward and progression
   * side effect in the gameplay transaction.
   */
  async startAdminReplay(
    userId: string,
    verseId: string,
    startedAt: Date,
  ): Promise<string | null> {
    return prisma.$transaction(async (transaction) => {
      const [verse, settings, active, platformSettings] = await Promise.all([
        transaction.verse.findFirst({
          where: {
            id: verseId,
            waypoints: {
              some: {
                userProgress: {
                  some: { userId, status: WaypointStatus.COMPLETED },
                },
              },
            },
          },
          select: {
            translations: { select: { translation: true, text: true } },
          },
        }),
        transaction.userSettings.findUnique({
          where: { userId },
          select: { preferredTranslation: true },
        }),
        transaction.gameSession.findFirst({
          where: {
            userId,
            verseId,
            isVaultReplay: true,
            isAdminTest: true,
            status: CompletionStatus.IN_PROGRESS,
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        }),
        transaction.platformSettings.findUnique({
          where: { id: "global" },
          select: { defaultTranslation: true },
        }),
      ]);

      if (active) return active.id;
      if (!verse) return null;

      const fallback =
        platformSettings?.defaultTranslation ?? TranslationCode.KJV;
      const preferred = settings?.preferredTranslation ?? fallback;
      const selected = selectTranslation(verse.translations, preferred, fallback);
      if (!selected) return null;

      const replay = await transaction.gameSession.create({
        data: {
          userId,
          verseId,
          dayLevel: VAULT_REPLAY_DAY_LEVEL,
          translation: selected.translation,
          status: CompletionStatus.IN_PROGRESS,
          isVaultReplay: true,
          isAdminTest: true,
          startedAt,
        },
        select: { id: true },
      });

      return replay.id;
    }, vaultTransactionOptions);
  },
} as const;
