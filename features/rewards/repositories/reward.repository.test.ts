/**
 * PostgreSQL integration coverage for atomic, idempotent Glow Point awards.
 *
 * Run only against the dedicated migrated test database configured through
 * TEST_DATABASE_URL and TEST_DATABASE_CONFIRMATION. The fixture creates one
 * isolated learner and removes every row in foreign-key order in `finally`.
 * It never accepts or connects to the normal application database.
 */
import assert from "node:assert/strict";
import test from "node:test";
import "dotenv/config";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;

test(
  "day reward ledger and balance commit once for one idempotency identity",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not configured." },
  async () => {
    if (!testDatabaseUrl) return;
    requireSafeTestDatabaseUrl({
      applicationDatabaseUrl,
      confirmation: process.env.TEST_DATABASE_CONFIRMATION,
      testDatabaseUrl,
    });
    process.env.DATABASE_URL = testDatabaseUrl;

    const [{ prisma }, { awardDayCompletionRewardInTransaction }] = await Promise.all([
      import("@/lib/prisma"),
      import("@/features/rewards/repositories/reward.repository"),
    ]);
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userId = `reward-test-${runId}`;

    try {
      await prisma.user.create({
        data: {
          id: userId,
          name: "Reward Integration Learner",
          email: `reward-${runId}@example.test`,
          profile: { create: { displayName: "Reward Learner" } },
        },
      });
      const first = await prisma.$transaction((transaction) =>
        awardDayCompletionRewardInTransaction(
          transaction,
          userId,
          "reward-test-waypoint",
          "GLIMMER",
        ),
      );
      assert.deepEqual(first, {
        dayLevel: "GLIMMER",
        amount: 100,
        balance: 100,
        waypointRewardTotal: 100,
      });

      await assert.rejects(
        prisma.$transaction((transaction) =>
          awardDayCompletionRewardInTransaction(
            transaction,
            userId,
            "reward-test-waypoint",
            "GLIMMER",
          ),
        ),
      );

      const [profile, ledger] = await Promise.all([
        prisma.userProfile.findUniqueOrThrow({
          where: { userId },
          select: { totalGlowPoints: true },
        }),
        prisma.rewardLedger.findMany({ where: { userId } }),
      ]);
      assert.equal(profile.totalGlowPoints, 100);
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0]?.amount, 100);
    } finally {
      await prisma.rewardLedger.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    }
  },
);
