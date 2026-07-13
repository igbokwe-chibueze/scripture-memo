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

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

test(
  "progression transitions enforce cooldowns, duplicates, and lazy next unlocks",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not configured." },
  async () => {
    if (!testDatabaseUrl) return;

    const databaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.slice(1));
    assert.match(databaseName, /test/i, "TEST_DATABASE_URL must name a database containing 'test'.");
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
    const verseIds: string[] = [];
    const waypointIds: string[] = [];
    await prisma.user.create({
      data: {
        id: userId,
        name: "Progression Integration User",
        email: `progression-${runId}@example.test`,
      },
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

      const firstVerseId = await createVerse(`Progression ${runId} First`, 1);
      const nextVerseId = await createVerse(`Progression ${runId} Next`, 3);
      const firstWaypoint = await prisma.waypoint.create({
        data: { number: 1, verseId: firstVerseId, journeyStage: "LEARN", isActive: true },
      });
      const nextWaypoint = await prisma.waypoint.create({
        // WHY: The gap proves progression queries the next published row rather
        // than manufacturing waypoint number N+1.
        data: { number: 3, verseId: nextVerseId, journeyStage: "LEARN", isActive: true },
      });
      waypointIds.push(firstWaypoint.id, nextWaypoint.id);

      const initialized = await progressionRepository.initializeFirstWaypoint(userId);
      assert.deepEqual(initialized, {
        status: "ready",
        waypointId: firstWaypoint.id,
        waypointNumber: 1,
      });
      assert.equal(await prisma.userWaypointProgress.count({ where: { userId } }), 1);
      assert.deepEqual(await progressionRepository.initializeFirstWaypoint(userId), initialized);
      assert.equal(await prisma.userWaypointProgress.count({ where: { userId } }), 1);

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
      await prisma.userDayProgress.deleteMany({ where: { userId } });
      await prisma.userWaypointProgress.deleteMany({ where: { userId } });
      await prisma.waypoint.deleteMany({ where: { id: { in: waypointIds } } });
      await prisma.verse.deleteMany({ where: { id: { in: verseIds } } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    }
  },
);
