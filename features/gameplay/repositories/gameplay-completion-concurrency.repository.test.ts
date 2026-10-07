/**
 * Verifies that concurrent submissions of one game attempt commit at most once.
 *
 * This suite requires a migrated, isolated local PostgreSQL database that can
 * open at least two connections. It creates one administrator-test session so
 * the real completion transaction runs without modifying learner progress,
 * streaks, badges, Beacon records, Glow balances, or cooldowns. All fixtures
 * use run-specific IDs and are removed in foreign-key order. The application
 * database and hosted production database are never used as test fallbacks.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import "dotenv/config";
import { getPostgresPoolConfig } from "@/lib/database/get-postgres-pool-config";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;
const singleConnectionReason =
  "Requires a multi-connection PostgreSQL test runtime; Prisma Local serializes connections.";

test(
  "two concurrent submissions of one valid attempt complete it only once",
  {
    skip: !testDatabaseUrl
      ? "TEST_DATABASE_URL is not configured."
      : getPostgresPoolConfig(testDatabaseUrl).max === 1
        ? singleConnectionReason
        : false,
  },
  async () => {
    if (!testDatabaseUrl) return;

    const safeTestDatabaseUrl = requireSafeTestDatabaseUrl({
      applicationDatabaseUrl,
      confirmation: process.env.TEST_DATABASE_CONFIRMATION,
      testDatabaseUrl,
    });
    process.env.DATABASE_URL = safeTestDatabaseUrl;

    const [{ prisma }, gameplayModule] = await Promise.all([
      import("@/lib/prisma"),
      import("@/features/gameplay/repositories/gameplay.repository"),
    ]);
    const { gameplayRepository, GameplayConflictError } = gameplayModule;
    const runId = randomUUID();
    const userId = `completion-race-${runId}`;
    const verseId = `completion-race-verse-${runId}`;
    const waypointId = `completion-race-waypoint-${runId}`;
    const verseText = "For God so loved the world.";
    const now = new Date();
    const waypointNumber = Math.floor(Math.random() * 1_000_000_000) + 1;
    let gameSessionId: string | null = null;

    try {
      // The learner identity is an administrator only so this test can use
      // the isolated Admin Test path, which deliberately awards no progress.
      await prisma.user.create({
        data: {
          id: userId,
          name: "Concurrency Test Admin",
          email: `${runId}@example.test`,
          role: "ADMIN",
        },
      });
      await prisma.verse.create({
        data: {
          id: verseId,
          reference: `Concurrency ${runId}:1`,
          book: "Concurrency",
          chapter: 1,
          verseStart: 1,
          isActive: true,
          translations: {
            create: {
              translation: "KJV",
              text: verseText,
              normalizedText: "for god so loved the world",
            },
          },
        },
      });
      await prisma.waypoint.create({
        data: {
          id: waypointId,
          number: waypointNumber,
          verseId,
          journeyStage: "LEARN",
          isActive: true,
        },
      });

      const gameSession = await gameplayRepository.startAdminTestSession(
        userId,
        waypointId,
        "DRAG_DROP",
        now,
      );
      gameSessionId = gameSession.id;
      const attempt = await gameplayRepository.startModeAttempt(
        userId,
        gameSession.id,
        "DRAG_DROP",
        now,
        true,
      );

      // Both callers submit the same authenticated session and active attempt.
      // A real concurrent PostgreSQL connection is necessary to exercise the
      // advisory lock instead of merely observing sequential action behavior.
      const results = await Promise.allSettled([
        gameplayRepository.completeModeAttempt(
          userId,
          gameSession.id,
          attempt.id,
          "DRAG_DROP",
          verseText,
          new Date(now.getTime() + 1_000),
          true,
        ),
        gameplayRepository.completeModeAttempt(
          userId,
          gameSession.id,
          attempt.id,
          "DRAG_DROP",
          verseText,
          new Date(now.getTime() + 1_000),
          true,
        ),
      ]);

      assert.equal(
        results.filter((result) => result.status === "fulfilled").length,
        1,
        "Exactly one submission should complete the attempt.",
      );
      const rejected = results.find((result) => result.status === "rejected");
      assert.ok(rejected && rejected.status === "rejected");
      assert.ok(rejected.reason instanceof GameplayConflictError);

      const [storedSession, storedAttempt] = await Promise.all([
        prisma.gameSession.findUniqueOrThrow({
          where: { id: gameSession.id },
          select: { status: true, completedAt: true },
        }),
        prisma.gameModeAttempt.findUniqueOrThrow({
          where: { id: attempt.id },
          select: { status: true, completedAt: true },
        }),
      ]);
      assert.equal(storedSession.status, "COMPLETED");
      assert.ok(storedSession.completedAt);
      assert.equal(storedAttempt.status, "COMPLETED");
      assert.ok(storedAttempt.completedAt);
      assert.equal(
        await prisma.rewardLedger.count({ where: { userId } }),
        0,
        "Admin Test completion must not create learner rewards.",
      );
      assert.equal(
        await prisma.beaconXpLedger.count({ where: { userId } }),
        0,
        "Admin Test completion must not award Beacon XP.",
      );
    } finally {
      // Delete only run-specific rows. Session deletion cascades its attempts;
      // the waypoint must be removed before its restricted verse relation.
      try {
        if (gameSessionId) {
          await prisma.gameSession.deleteMany({ where: { id: gameSessionId } });
        }
        await prisma.waypoint.deleteMany({ where: { id: waypointId } });
        await prisma.verse.deleteMany({ where: { id: verseId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      } finally {
        await prisma.$disconnect();
      }
    }
  },
);
