/**
 * PostgreSQL integration coverage for atomic progression and cooldown rules.
 *
 * Run with `TEST_DATABASE_URL` pointing to an empty, migrated PostgreSQL test
 * database whose name contains "test", then execute
 * `npm run test:progression:integration`. The suite switches `DATABASE_URL`
 * before importing Prisma, refuses a non-test or non-empty waypoint database,
 * creates all fixtures itself, and deletes them in foreign-key order.
 */
import assert from "node:assert/strict";
import test from "node:test";
import "dotenv/config";
import type { Prisma } from "@/lib/generated/prisma/client";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;

test(
  "progression transitions enforce cooldowns, duplicates, and lazy next unlocks",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not configured." },
  async () => {
    if (!testDatabaseUrl) return;

    requireSafeTestDatabaseUrl({
      applicationDatabaseUrl,
      confirmation: process.env.TEST_DATABASE_CONFIRMATION,
      testDatabaseUrl,
    });
    process.env.DATABASE_URL = testDatabaseUrl;

    const [{ prisma }, progressionModule] = await Promise.all([
      import("@/lib/prisma"),
      import("@/features/progression/repositories/progression.repository"),
    ]);
    const { progressionRepository, ProgressionConflictError } = progressionModule;

    // WHY: Curriculum lookup is global and ordered. Requiring an empty waypoint
    // table prevents unrelated fixtures from changing which waypoint is first.
    assert.equal(
      await prisma.waypoint.count(),
      0,
      "The progression integration database must have no waypoints before the suite starts.",
    );

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userId = `progression-test-user-${runId}`;
    const raceUserId = `progression-race-user-${runId}`;
    const userIds = [userId, raceUserId];
    const verseIds: string[] = [];
    const waypointIds: string[] = [];
    await prisma.user.createMany({
      data: [
        {
          id: userId,
          name: "Progression Integration User",
          email: `progression-${runId}@example.test`,
        },
        {
          id: raceUserId,
          name: "Progression Race User",
          email: `progression-race-${runId}@example.test`,
        },
      ],
    });

    try {
      const createVerse = async (reference: string, verseStart: number): Promise<string> => {
        const verse = await prisma.verse.create({
          data: {
            reference,
            book: "John",
            chapter: 1,
            verseStart,
            isActive: true,
          },
        });
        verseIds.push(verse.id);
        return verse.id;
      };

      /** Waits until the competing progression transaction is blocked on the lock. */
      const waitForAdvisoryLockWaiter = async (): Promise<void> => {
        for (let attempt = 0; attempt < 100; attempt += 1) {
          const [row] = await prisma.$queryRaw<Array<{ waiting: bigint }>>`
            SELECT COUNT(*)::bigint AS waiting
            FROM pg_locks
            WHERE locktype = 'advisory' AND granted = false
          `;
          if (Number(row?.waiting ?? 0) > 0) return;
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
        }
        assert.fail("Progression did not wait for the held curriculum lock.");
      };

      /**
       * Runs progression while an administrator-style transaction owns the
       * shared curriculum lock, then commits a mutation before progression may
       * re-check availability. This deterministically reproduces the reviewed
       * race instead of depending on arbitrary timing delays.
       */
      const runAfterLockedCurriculumMutation = async <T>(
        operation: () => Promise<T>,
        mutation: (transaction: Prisma.TransactionClient) => Promise<void>,
      ): Promise<T> => {
        let announceLockHeld: (() => void) | undefined;
        const lockHeld = new Promise<void>((resolve) => {
          announceLockHeld = resolve;
        });
        let allowMutation: (() => void) | undefined;
        const mutationAllowed = new Promise<void>((resolve) => {
          allowMutation = resolve;
        });

        const adminMutation = prisma.$transaction(async (transaction) => {
          await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('scripture-memo-curriculum'))`;
          announceLockHeld?.();
          await mutationAllowed;
          await mutation(transaction);
        });
        await lockHeld;
        const progressionOperation = operation();

        let waitFailure: unknown;
        try {
          await waitForAdvisoryLockWaiter();
        } catch (error: unknown) {
          waitFailure = error;
        } finally {
          allowMutation?.();
        }
        await adminMutation;
        if (waitFailure) {
          await progressionOperation.catch(() => undefined);
          throw waitFailure;
        }
        return progressionOperation;
      };

      const firstVerseId = await createVerse(`Progression ${runId} First`, 1);
      const nextVerseId = await createVerse(`Progression ${runId} Next`, 3);
      const firstWaypoint = await prisma.waypoint.create({
        data: { number: 1, verseId: firstVerseId, journeyStage: "LEARN", isActive: true },
      });
      const nextWaypoint = await prisma.waypoint.create({
        // WHY: The gap proves progression queries the next published row rather
        // than manufacturing waypoint number N+1.
        data: { number: 3, verseId: nextVerseId, journeyStage: "LEARN", isActive: false },
      });
      waypointIds.push(firstWaypoint.id, nextWaypoint.id);

      const unavailableInitialization = await runAfterLockedCurriculumMutation(
        () => progressionRepository.initializeFirstWaypoint(raceUserId),
        async (transaction) => {
          await transaction.waypoint.update({
            where: { id: firstWaypoint.id },
            data: { isActive: false },
          });
        },
      );
      assert.deepEqual(unavailableInitialization, { status: "curriculum-unavailable" });
      assert.equal(
        await prisma.userWaypointProgress.count({ where: { userId: raceUserId } }),
        0,
        "Initialization must not attach history to curriculum hidden under the shared lock.",
      );
      await prisma.waypoint.update({
        where: { id: firstWaypoint.id },
        data: { isActive: true },
      });

      const initialized = await progressionRepository.initializeFirstWaypoint(userId);
      assert.deepEqual(initialized, {
        status: "ready",
        waypointId: firstWaypoint.id,
        waypointNumber: 1,
      });
      assert.equal(await prisma.userWaypointProgress.count({ where: { userId } }), 1);
      assert.deepEqual(await progressionRepository.initializeFirstWaypoint(userId), initialized);
      assert.equal(await prisma.userWaypointProgress.count({ where: { userId } }), 1);

      await prisma.waypoint.update({
        where: { id: nextWaypoint.id },
        data: { isActive: true },
      });
      const unavailableNextWaypoint = await runAfterLockedCurriculumMutation(
        () => progressionRepository.unlockNextWaypoint(raceUserId, firstWaypoint.number),
        async (transaction) => {
          await transaction.waypoint.update({
            where: { id: nextWaypoint.id },
            data: { isActive: false },
          });
        },
      );
      assert.equal(unavailableNextWaypoint, null);
      assert.equal(
        await prisma.userWaypointProgress.count({
          where: { userId: raceUserId, waypointId: nextWaypoint.id },
        }),
        0,
        "Next unlock must re-check availability after the admin mutation commits.",
      );
      await prisma.waypoint.update({
        where: { id: nextWaypoint.id },
        data: { isActive: true },
      });

      const day1CompletedAt = new Date("2026-07-01T08:00:00.000Z");
      await progressionRepository.prepareDayForGameplay(
        userId,
        firstWaypoint.id,
        "GLIMMER",
        new Date("2026-07-01T07:55:00.000Z"),
      );
      const day1 = await progressionRepository.markDayComplete(
        userId,
        firstWaypoint.id,
        "GLIMMER",
        day1CompletedAt,
      );
      assert.equal(day1.nextDayUnlocksAt?.toISOString(), "2026-07-02T08:00:00.000Z");

      const earlyStartError = await progressionRepository
        .prepareDayForGameplay(
          userId,
          firstWaypoint.id,
          "GLOW",
          new Date("2026-07-02T07:59:59.999Z"),
        )
        .then(() => null)
        .catch((error: unknown) => error);
      assert.ok(earlyStartError instanceof ProgressionConflictError);
      assert.equal(earlyStartError.code, "DAY_COOLDOWN_ACTIVE");

      await progressionRepository.prepareDayForGameplay(
        userId,
        firstWaypoint.id,
        "GLOW",
        new Date("2026-07-02T08:00:00.000Z"),
      );
      await progressionRepository.markDayComplete(
        userId,
        firstWaypoint.id,
        "GLOW",
        new Date("2026-07-02T08:05:00.000Z"),
      );
      await progressionRepository.prepareDayForGameplay(
        userId,
        firstWaypoint.id,
        "RADIANCE",
        new Date("2026-07-03T08:05:00.000Z"),
      );
      const day3 = await progressionRepository.markDayComplete(
        userId,
        firstWaypoint.id,
        "RADIANCE",
        new Date("2026-07-03T08:10:00.000Z"),
      );
      assert.deepEqual(day3.unlockedWaypoint, { id: nextWaypoint.id, number: 3 });
      assert.equal(day3.caughtUp, false);
      assert.equal(
        (await progressionRepository.getUserWaypointProgress(userId, firstWaypoint.id))?.status,
        "COMPLETED",
      );
      assert.equal(
        (await progressionRepository.getUserWaypointProgress(userId, nextWaypoint.id))?.status,
        "UNLOCKED",
      );

      const repeatError = await progressionRepository
        .markDayComplete(userId, firstWaypoint.id, "RADIANCE", new Date())
        .then(() => null)
        .catch((error: unknown) => error);
      assert.ok(repeatError instanceof ProgressionConflictError);
      assert.equal(repeatError.code, "DAY_ALREADY_COMPLETED");

      const duplicateConstraintError = await prisma.userDayProgress
        .create({
          data: { userId, waypointId: firstWaypoint.id, dayLevel: "GLIMMER" },
        })
        .then(() => null)
        .catch((error: unknown) => error);
      assert.ok(duplicateConstraintError, "The database must reject duplicate day progress.");
      assert.equal(
        await prisma.userDayProgress.count({
          where: { userId, waypointId: firstWaypoint.id, dayLevel: "GLIMMER" },
        }),
        1,
      );
    } finally {
      await prisma.userDayProgress.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.userWaypointProgress.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.waypoint.deleteMany({ where: { id: { in: waypointIds } } });
      await prisma.verse.deleteMany({ where: { id: { in: verseIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      await prisma.$disconnect();
    }
  },
);
