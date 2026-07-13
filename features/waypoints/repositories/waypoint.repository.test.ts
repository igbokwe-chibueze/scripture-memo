/**
 * PostgreSQL integration coverage for the permanent waypoint curriculum rules.
 *
 * Run with `TEST_DATABASE_URL` pointing to an empty, migrated PostgreSQL database
 * whose database name contains "test", then execute `npm run test:integration`.
 * The explicit separate URL and empty-database checks prevent this fixture suite
 * from mutating development or production data. Prisma and the repositories are
 * imported only after the test URL replaces `DATABASE_URL`, so they cannot open a
 * pool against the normal application database by accident.
 *
 * The suite creates its own administrator, verses, waypoints, learner progress,
 * and audit rows. Cleanup runs in `finally` and removes records in foreign-key
 * order. A failed assertion therefore remains safe and repeatable.
 */
import assert from "node:assert/strict";
import test from "node:test";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

test(
  "waypoint lifecycle and concurrency invariants survive real database writes",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not configured." },
  async () => {
    if (!testDatabaseUrl) return;

    const databaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.slice(1));
    assert.match(
      databaseName,
      /test/i,
      "TEST_DATABASE_URL must name a database containing 'test'.",
    );

    process.env.DATABASE_URL = testDatabaseUrl;
    const [{ prisma }, { waypointRepository }, verseModule] = await Promise.all([
      import("@/lib/prisma"),
      import("@/features/waypoints/repositories/waypoint.repository"),
      import("@/features/verses/repositories/verse.repository"),
    ]);
    const { VerseCurriculumConflictError, verseRepository } = verseModule;

    // WHY: Appending and reordering reason about the complete curriculum. An
    // empty isolated database makes those assertions deterministic and prevents
    // the suite from renumbering fixtures owned by another test.
    assert.equal(
      await prisma.waypoint.count(),
      0,
      "The waypoint integration database must be empty before the suite starts.",
    );

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const actorId = `waypoint-test-admin-${runId}`;
    const createdVerseIds: string[] = [];

    await prisma.user.create({
      data: {
        id: actorId,
        name: "Waypoint Integration Admin",
        email: `waypoint-${runId}@example.test`,
        role: "ADMIN",
      },
    });

    try {
      const createVerse = async (suffix: string): Promise<string> => {
        const verse = await prisma.verse.create({
          data: {
            reference: `Test ${runId} ${suffix}`,
            book: "John",
            chapter: 1,
            verseStart: createdVerseIds.length + 1,
            isActive: true,
            createdById: actorId,
          },
        });
        createdVerseIds.push(verse.id);
        return verse.id;
      };

      const [firstAppend, secondAppend] = await Promise.all([
        waypointRepository.create(actorId, null),
        waypointRepository.create(actorId, null),
      ]);
      assert.deepEqual(
        [firstAppend.number, secondAppend.number].sort((left, right) => left - right),
        [1, 2],
        "Concurrent appends must receive distinct consecutive numbers.",
      );

      const primaryVerseId = await createVerse("primary");
      assert.deepEqual(
        await waypointRepository.assignVerse(firstAppend.id, primaryVerseId, "LEARN", actorId, null),
        { status: "assigned" },
      );
      assert.deepEqual(
        await waypointRepository.publish(firstAppend.id, actorId, null),
        { status: "published" },
      );

      const replacementVerseId = await createVerse("replacement");
      assert.deepEqual(
        await waypointRepository.assignVerse(firstAppend.id, replacementVerseId, "LEARN", actorId, null),
        { status: "published-locked" },
        "A published waypoint must be hidden before an assignment changes.",
      );

      const dependencyError = await verseRepository
        .archive(primaryVerseId, actorId, null)
        .then(() => null)
        .catch((error: unknown) => error);
      assert.ok(dependencyError instanceof VerseCurriculumConflictError);
      assert.equal(dependencyError.code, "PUBLISHED_WAYPOINT_DEPENDENCY");
      assert.deepEqual(dependencyError.waypointNumbers, [1]);

      await prisma.userWaypointProgress.create({
        data: {
          userId: actorId,
          waypointId: firstAppend.id,
          status: "IN_PROGRESS",
          unlockedAt: new Date(),
          startedAt: new Date(),
        },
      });
      assert.deepEqual(
        await waypointRepository.hide(firstAppend.id, actorId, null),
        "progress-locked",
      );
      assert.deepEqual(
        await waypointRepository.assignVerse(firstAppend.id, replacementVerseId, "LEARN", actorId, null),
        { status: "progress-locked" },
      );

      const historicalEditError = await verseRepository
        .upsertTranslation(primaryVerseId, "NIV", "Changed historical text")
        .then(() => null)
        .catch((error: unknown) => error);
      assert.ok(historicalEditError instanceof VerseCurriculumConflictError);
      assert.equal(historicalEditError.code, "LEARNER_HISTORY_LOCK");

      const stageVerseId = await createVerse("stages");
      const thirdAppend = await waypointRepository.create(actorId, null);
      const fourthAppend = await waypointRepository.create(actorId, null);
      assert.deepEqual(
        await waypointRepository.assignVerse(secondAppend.id, stageVerseId, "MASTER", actorId, null),
        { status: "assigned" },
      );
      assert.deepEqual(
        await waypointRepository.assignVerse(thirdAppend.id, stageVerseId, "MASTER", actorId, null),
        { status: "assigned" },
        "Master appearances may repeat.",
      );

      const uniqueStageVerseId = await createVerse("unique-stage");
      assert.deepEqual(
        await waypointRepository.assignVerse(secondAppend.id, uniqueStageVerseId, "LEARN", actorId, null),
        { status: "assigned" },
      );
      assert.deepEqual(
        await waypointRepository.assignVerse(fourthAppend.id, uniqueStageVerseId, "LEARN", actorId, null),
        { status: "duplicate-stage", existingNumber: secondAppend.number },
      );

      const auditCount = await prisma.auditLog.count({ where: { actorId } });
      assert.ok(auditCount >= 8, "Successful curriculum writes must leave audit evidence.");
    } finally {
      // WHY: Foreign-key order matters. Learner records are removed before their
      // waypoints, and audit rows before the actor, so cleanup succeeds even when
      // an assertion throws halfway through the suite.
      await prisma.userWaypointProgress.deleteMany({ where: { userId: actorId } });
      await prisma.auditLog.deleteMany({ where: { actorId } });
      await prisma.waypoint.deleteMany({});
      await prisma.verse.deleteMany({ where: { id: { in: createdVerseIds } } });
      await prisma.user.deleteMany({ where: { id: actorId } });
      await prisma.$disconnect();
    }
  },
);
