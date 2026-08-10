import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { TranslationCode, UserRole, WaypointStatus } from "@/lib/generated/prisma/enums";
import { getPostgresPoolConfig } from "@/lib/database/get-postgres-pool-config";
import { normalizeVerseText } from "@/features/verses/lib/normalize-verse-text";
import { assertLocalDatabaseUrl } from "@/features/dev-fixtures/lib/assert-local-database-url";
import { LOCAL_CURRICULUM_FIXTURES } from "@/features/dev-fixtures/data/local-curriculum-fixtures";

export type LocalFixtureSummary = {
  createdVerses: number;
  reusedVerses: number;
  publishedWaypoints: number;
};

export type LocalPlayerPreparation = {
  email: string;
  role: UserRole;
  firstWaypointNumber: number;
};

/** Counts returned after a local learner is restored to a new-player state. */
export type LocalPlayerProgressReset = {
  email: string;
  firstWaypointNumber: number;
  removedGameSessions: number;
  removedWaypointRecords: number;
  removedDayRecords: number;
  removedBadgeRecords: number;
  removedRewardRecords: number;
};

/**
 * Creates a short-lived repository for explicit local fixture commands.
 *
 * The loopback assertion runs before Prisma Client exists. This is intentionally
 * separate from the application's singleton because command-line fixtures have
 * a different lifecycle and must disconnect even when a write fails.
 */
export function createLocalFixtureRepository(databaseUrl: string) {
  const verifiedUrl = assertLocalDatabaseUrl(databaseUrl);
  const client = new PrismaClient({
    adapter: new PrismaPg(getPostgresPoolConfig(verifiedUrl)),
  });

  return {
    /**
     * Creates five public-domain KJV verses and assigns the first five waypoint
     * placeholders. Existing matching verses are preserved, and learner-linked
     * waypoint history causes the complete transaction to fail safely.
     */
    async seedCurriculum(): Promise<LocalFixtureSummary> {
      return client.$transaction(async (transaction) => {
        const waypointNumbers = LOCAL_CURRICULUM_FIXTURES.map(
          ({ waypointNumber }) => waypointNumber,
        );
        const waypoints = await transaction.waypoint.findMany({
          where: { number: { in: waypointNumbers } },
          select: {
            id: true,
            number: true,
            verseId: true,
            _count: {
              select: {
                userProgress: true,
                dayProgress: true,
                gameSessions: true,
              },
            },
          },
          orderBy: { number: "asc" },
        });

        if (waypoints.length !== LOCAL_CURRICULUM_FIXTURES.length) {
          throw new Error(
            "Waypoint placeholders 1–5 are missing. Run `npx prisma db seed` first.",
          );
        }

        const progressedWaypoint = waypoints.find(
          ({ _count }) =>
            _count.userProgress > 0 ||
            _count.dayProgress > 0 ||
            _count.gameSessions > 0,
        );
        if (progressedWaypoint) {
          throw new Error(
            `Waypoint ${progressedWaypoint.number} already has learner history; local curriculum fixtures will not overwrite it.`,
          );
        }

        let createdVerses = 0;
        let reusedVerses = 0;

        for (const fixture of LOCAL_CURRICULUM_FIXTURES) {
          const existingVerse = await transaction.verse.findUnique({
            where: { reference: fixture.reference },
            select: { id: true },
          });
          const verse = existingVerse
            ? existingVerse
            : await transaction.verse.create({
                data: {
                  reference: fixture.reference,
                  book: fixture.book,
                  chapter: fixture.chapter,
                  verseStart: fixture.verseStart,
                  verseEnd: fixture.verseEnd,
                  reflection: fixture.reflection,
                  studyNote: fixture.studyNote,
                  isActive: true,
                  translations: {
                    create: {
                      translation: TranslationCode.KJV,
                      text: fixture.kjvText,
                      normalizedText: normalizeVerseText(fixture.kjvText),
                    },
                  },
                },
                select: { id: true },
              });

          if (existingVerse) reusedVerses += 1;
          else createdVerses += 1;

          const waypoint = waypoints.find(
            ({ number }) => number === fixture.waypointNumber,
          );
          if (!waypoint) {
            throw new Error(`Waypoint ${fixture.waypointNumber} disappeared during seeding.`);
          }

          await transaction.waypoint.update({
            where: { id: waypoint.id },
            data: {
              verseId: verse.id,
              journeyStage: fixture.journeyStage,
              isActive: true,
            },
          });
        }

        return {
          createdVerses,
          reusedVerses,
          publishedWaypoints: LOCAL_CURRICULUM_FIXTURES.length,
        };
      });
    },

    /**
     * Prepares an account only after Better Auth has registered its credentials.
     * Password and Account records are never created or edited by this fixture.
     */
    async preparePlayer(
      email: string,
      requestedRole: UserRole | null,
    ): Promise<LocalPlayerPreparation> {
      return client.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, role: true },
        });
        if (!user) {
          throw new Error(
            "No local account has that email. Register through the application first.",
          );
        }

        const firstWaypoint = await transaction.waypoint.findFirst({
          where: { isActive: true, verseId: { not: null } },
          select: { id: true, number: true },
          orderBy: { number: "asc" },
        });
        if (!firstWaypoint) {
          throw new Error("No playable local waypoint exists. Seed local fixtures first.");
        }

        // WHY: Local authorization testing needs exact ADMIN and SUPER_ADMIN
        // identities. The command accepts a generated enum value, operates only
        // after the loopback URL guard, and never infers a privileged role from
        // user-controlled application input.
        const role = requestedRole ?? user.role;
        if (requestedRole && user.role !== requestedRole) {
          await transaction.user.update({
            where: { id: user.id },
            data: { role },
          });
        }

        await transaction.userProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id,
            displayName: user.name,
          },
        });
        await transaction.userSettings.upsert({
          where: { userId: user.id },
          update: {
            preferredTranslation: TranslationCode.KJV,
            hasSelectedTranslation: true,
          },
          create: {
            userId: user.id,
            preferredTranslation: TranslationCode.KJV,
            hasSelectedTranslation: true,
          },
        });
        await transaction.userStreak.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
        await transaction.userWaypointProgress.upsert({
          where: {
            userId_waypointId: {
              userId: user.id,
              waypointId: firstWaypoint.id,
            },
          },
          update: {},
          create: {
            userId: user.id,
            waypointId: firstWaypoint.id,
            status: WaypointStatus.UNLOCKED,
            unlockedAt: new Date(),
          },
        });

        return {
          email: user.email,
          role,
          firstWaypointNumber: firstWaypoint.number,
        };
      });
    },

    /**
     * Removes all progression and earned/spent game state for one local account.
     *
     * WHY: This destructive maintenance operation is deliberately available only
     * through the loopback-guarded fixture repository. Better Auth credentials,
     * sessions, authorization role, settings, identity, notes, favourites, and
     * Fellowship membership are preserved because they are not learner progress.
     * All dependent rows and summary counters change in one transaction, so an
     * interruption cannot leave ledger totals disagreeing with the profile.
     */
    async resetPlayerProgress(email: string): Promise<LocalPlayerProgressReset> {
      return client.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        });
        if (!user) {
          throw new Error("No local account has that email.");
        }

        const firstWaypoint = await transaction.waypoint.findFirst({
          where: { isActive: true, verseId: { not: null } },
          select: { id: true, number: true },
          orderBy: { number: "asc" },
        });
        if (!firstWaypoint) {
          throw new Error("No playable local waypoint exists. Seed local fixtures first.");
        }

        // Sessions own attempts and hint usages through cascading relations.
        // They must be removed before their restrict-linked day progress rows.
        const gameSessions = await transaction.gameSession.deleteMany({
          where: { userId: user.id },
        });
        const dayProgress = await transaction.userDayProgress.deleteMany({
          where: { userId: user.id },
        });
        const waypointProgress = await transaction.userWaypointProgress.deleteMany({
          where: { userId: user.id },
        });

        const [badgeProgress, rewardLedger] = await Promise.all([
          transaction.userBadgeProgress.deleteMany({ where: { userId: user.id } }),
          transaction.rewardLedger.deleteMany({ where: { userId: user.id } }),
          transaction.beaconXpLedger.deleteMany({ where: { userId: user.id } }),
          transaction.beaconWeeklyScore.deleteMany({ where: { userId: user.id } }),
          transaction.beaconLeagueMembership.deleteMany({ where: { userId: user.id } }),
          transaction.userShopPurchase.deleteMany({ where: { userId: user.id } }),
          transaction.userNotification.deleteMany({ where: { userId: user.id } }),
        ]);

        // Reset derived counters instead of replacing the profile, preserving
        // the learner's chosen avatar, frame, country, display name, and partner.
        await transaction.userProfile.update({
          where: { userId: user.id },
          data: {
            totalGlowPoints: 0,
            totalWaypointsCompleted: 0,
            totalHintsUsed: 0,
            beaconXp: 0,
            beaconLevel: 1,
            beaconCrowns: 0,
          },
        });
        await transaction.userStreak.upsert({
          where: { userId: user.id },
          update: {
            currentStreak: 0,
            bestStreak: 0,
            lastActiveAt: null,
          },
          create: { userId: user.id },
        });

        // A normal new learner begins with exactly one playable waypoint. This
        // baseline is not earned history and allows immediate Glimmer testing.
        await transaction.userWaypointProgress.create({
          data: {
            userId: user.id,
            waypointId: firstWaypoint.id,
            status: WaypointStatus.UNLOCKED,
            unlockedAt: new Date(),
          },
        });

        return {
          email: user.email,
          firstWaypointNumber: firstWaypoint.number,
          removedGameSessions: gameSessions.count,
          removedWaypointRecords: waypointProgress.count,
          removedDayRecords: dayProgress.count,
          removedBadgeRecords: badgeProgress.count,
          removedRewardRecords: rewardLedger.count,
        };
      });
    },

    /** Always releases the fixture-only connection pool after the CLI finishes. */
    async disconnect(): Promise<void> {
      await client.$disconnect();
    },
  } as const;
}
