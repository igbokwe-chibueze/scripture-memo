import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import {
  TranslationCode,
  WaypointStatus,
} from "@/lib/generated/prisma/enums";
import { getPostgresPoolConfig } from "@/lib/database/get-postgres-pool-config";
import { assertLocalDatabaseUrl } from "@/features/dev-fixtures/lib/assert-local-database-url";
import { normalizeVerseText } from "@/features/verses/lib/normalize-verse-text";
import { slugifyTag } from "@/features/verses/lib/normalize-tags";
import type { CurriculumData } from "@/features/curriculum/types/curriculum-data.types";

export type CurriculumResetSummary = {
  usersPreserved: number;
  versesCreated: number;
  waypointsCreated: number;
  studyGuidesCreated: number;
};

export type CurriculumVerification = {
  users: number;
  activeVerses: number;
  activeWaypoints: number;
  translations: number;
  studyGuides: number;
  waypointProgress: number;
  dayProgress: number;
  gameSessions: number;
  badgeProgress: number;
  rewardEntries: number;
  purchasedHints: number;
  notifications: number;
  fellowshipMemberships: number;
  nonZeroProfiles: number;
};

/**
 * Creates the local-only repository used by the destructive curriculum reset.
 *
 * The loopback assertion happens before Prisma Client exists. This prevents a
 * stale hosted DATABASE_URL from turning an explicit local maintenance command
 * into an accidental production data deletion.
 */
export function createLocalCurriculumRepository(databaseUrl: string) {
  const verifiedUrl = assertLocalDatabaseUrl(databaseUrl);
  const client = new PrismaClient({
    adapter: new PrismaPg(getPostgresPoolConfig(verifiedUrl)),
  });

  return {
    /** Returns aggregate-only evidence that the import and preservation rules held. */
    async verifyImport(): Promise<CurriculumVerification> {
      const [
        users,
        activeVerses,
        activeWaypoints,
        translations,
        studyGuides,
        waypointProgress,
        dayProgress,
        gameSessions,
        badgeProgress,
        rewardEntries,
        purchasedHints,
        notifications,
        fellowshipMemberships,
        nonZeroProfiles,
      ] = await Promise.all([
        client.user.count(),
        client.verse.count({ where: { isActive: true } }),
        client.waypoint.count({ where: { isActive: true } }),
        client.verseTranslation.count(),
        client.verse.count({ where: { studyNote: { not: null } } }),
        client.userWaypointProgress.count(),
        client.userDayProgress.count(),
        client.gameSession.count(),
        client.userBadgeProgress.count(),
        client.rewardLedger.count(),
        client.userShopPurchase.count(),
        client.userNotification.count(),
        client.fellowshipMember.count(),
        client.userProfile.count({
          where: {
            OR: [
              { totalGlowPoints: { not: 0 } },
              { totalWaypointsCompleted: { not: 0 } },
              { totalHintsUsed: { not: 0 } },
              { beaconXp: { not: 0 } },
              { beaconLevel: { not: 1 } },
              { beaconCrowns: { not: 0 } },
            ],
          },
        }),
      ]);

      return {
        users,
        activeVerses,
        activeWaypoints,
        translations,
        studyGuides,
        waypointProgress,
        dayProgress,
        gameSessions,
        badgeProgress,
        rewardEntries,
        purchasedHints,
        notifications,
        fellowshipMemberships,
        nonZeroProfiles,
      };
    },

    /**
     * Reads the affected state before deletion so the CLI can write a timestamped
     * recovery snapshot. Authentication, settings, purchases, notifications, and
     * fellowships are intentionally not included because they are preserved.
     */
    async createBackupSnapshot(): Promise<Record<string, unknown>> {
      const [
        profiles,
        streaks,
        verses,
        waypoints,
        waypointProgress,
        dayProgress,
        gameSessions,
        badgeProgress,
        rewardLedger,
        beaconXpLedger,
        beaconWeeks,
        notes,
        favorites,
      ] = await Promise.all([
        client.userProfile.findMany(),
        client.userStreak.findMany(),
        client.verse.findMany({
          include: {
            translations: true,
            tags: { include: { tag: true } },
          },
        }),
        client.waypoint.findMany(),
        client.userWaypointProgress.findMany(),
        client.userDayProgress.findMany(),
        client.gameSession.findMany({
          include: { attempts: true, hintUsages: true },
        }),
        client.userBadgeProgress.findMany(),
        client.rewardLedger.findMany(),
        client.beaconXpLedger.findMany(),
        client.beaconWeek.findMany({
          include: { scores: true, cohorts: true, memberships: true },
        }),
        client.userVerseNote.findMany(),
        client.userFavoriteVerse.findMany(),
      ]);

      return {
        backedUpAt: new Date().toISOString(),
        profiles,
        streaks,
        verses,
        waypoints,
        waypointProgress,
        dayProgress,
        gameSessions,
        badgeProgress,
        rewardLedger,
        beaconXpLedger,
        beaconWeeks,
        notes,
        favorites,
      };
    },

    /**
     * Replaces the complete curriculum and resets earned progress atomically.
     *
     * Accounts and identity records are preserved. All deletes, counter resets,
     * verse writes, waypoint assignments, and initial waypoint unlocks share one
     * transaction so an interruption cannot leave a half-imported curriculum.
     */
    async resetAndImport(data: CurriculumData): Promise<CurriculumResetSummary> {
      return client.$transaction(
        async (transaction) => {
          const users = await transaction.user.findMany({
            select: { id: true },
          });

          // Sessions cascade to attempts and hint usages. Restrict-linked day
          // and waypoint rows can only be removed safely after the sessions.
          await transaction.gameSession.deleteMany();
          await transaction.userDayProgress.deleteMany();
          await transaction.userWaypointProgress.deleteMany();
          await transaction.userBadgeProgress.deleteMany();
          await transaction.rewardLedger.deleteMany();
          await transaction.beaconXpLedger.deleteMany();
          await transaction.beaconWeek.deleteMany();

          // Notes, favourites, and pack membership point at the old Verse IDs.
          // They cannot survive a complete canonical curriculum replacement.
          await transaction.userVerseNote.deleteMany();
          await transaction.userFavoriteVerse.deleteMany();
          await transaction.packVerse.deleteMany();
          await transaction.waypoint.deleteMany();
          await transaction.verse.deleteMany();
          await transaction.tag.deleteMany();

          await transaction.userProfile.updateMany({
            data: {
              totalGlowPoints: 0,
              totalWaypointsCompleted: 0,
              totalHintsUsed: 0,
              beaconXp: 0,
              beaconLevel: 1,
              beaconCrowns: 0,
            },
          });
          await transaction.userStreak.updateMany({
            data: {
              currentStreak: 0,
              bestStreak: 0,
              lastActiveAt: null,
            },
          });
          await transaction.userSettings.updateMany({
            data: {
              preferredTranslation: TranslationCode.KJV,
              hasSelectedTranslation: true,
            },
          });

          // Create all canonical verses first. A reference-to-ID map then makes
          // the 400 waypoint assignments deterministic without per-waypoint reads.
          for (const verseData of data.verses) {
            await transaction.verse.create({
              data: {
                reference: verseData.reference,
                book: verseData.book,
                chapter: verseData.chapter,
                verseStart: verseData.verseStart,
                verseEnd: verseData.verseEnd,
                reflection: verseData.reflection,
                studyNote: verseData.studyNote,
                isActive: true,
                translations: {
                  create: Object.entries(verseData.translations).map(
                    ([translation, text]) => ({
                      translation: translation as TranslationCode,
                      text,
                      normalizedText: normalizeVerseText(text),
                    }),
                  ),
                },
                tags: {
                  create: verseData.tags.map((name) => ({
                    tag: {
                      connectOrCreate: {
                        where: { slug: slugifyTag(name) },
                        create: { name, slug: slugifyTag(name) },
                      },
                    },
                  })),
                },
              },
            });
          }

          const persistedVerses = await transaction.verse.findMany({
            select: { id: true, reference: true },
          });
          const verseIds = new Map(
            persistedVerses.map(({ id, reference }) => [reference, id]),
          );

          await transaction.waypoint.createMany({
            data: data.waypoints.map((waypoint) => {
              const verseId = verseIds.get(waypoint.reference);
              if (!verseId) {
                throw new Error(
                  `Curriculum reference ${waypoint.reference} was not persisted.`,
                );
              }
              return {
                number: waypoint.number,
                verseId,
                journeyStage: waypoint.journeyStage,
                isActive: true,
              };
            }),
          });

          const firstWaypoint = await transaction.waypoint.findUniqueOrThrow({
            where: { number: 1 },
            select: { id: true },
          });
          if (users.length > 0) {
            await transaction.userWaypointProgress.createMany({
              data: users.map(({ id: userId }) => ({
                userId,
                waypointId: firstWaypoint.id,
                status: WaypointStatus.UNLOCKED,
                unlockedAt: new Date(),
              })),
            });
          }

          return {
            usersPreserved: users.length,
            versesCreated: data.verses.length,
            waypointsCreated: data.waypoints.length,
            studyGuidesCreated: data.verses.filter(
              ({ studyNote }) => studyNote !== null,
            ).length,
          };
        },
        {
          maxWait: 10_000,
          timeout: 120_000,
        },
      );
    },

    /** Releases the maintenance-only connection pool on every CLI outcome. */
    async disconnect(): Promise<void> {
      await client.$disconnect();
    },
  } as const;
}
