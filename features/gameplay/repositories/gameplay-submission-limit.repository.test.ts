/**
 * Guarded PostgreSQL integration coverage for gameplay submission throttling.
 *
 * Run only with TEST_DATABASE_URL and TEST_DATABASE_CONFIRMATION pointing to
 * the dedicated local integration database. This test uses a synthetic user
 * identifier, confirms the shared fixed-window cap under concurrent calls, and
 * removes only its HMAC-derived RateLimit key in `finally`. It never creates a
 * gameplay session or touches player progression. The database guard rejects
 * the development listener and any non-local database before connecting.
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createHmac, randomUUID } from "node:crypto";
import "dotenv/config";
import { getPostgresPoolConfig } from "@/lib/database/get-postgres-pool-config";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;
let disconnectIntegrationPrisma: (() => Promise<void>) | undefined;

after(async () => {
  await disconnectIntegrationPrisma?.();
});

test(
  "gameplay completion throttling is shared, concurrent-safe, and resets after one minute",
  {
    skip: !testDatabaseUrl
      ? "TEST_DATABASE_URL is not configured."
      : getPostgresPoolConfig(testDatabaseUrl).max === 1
        ? "Requires multiple PostgreSQL connections; Prisma Local serializes requests."
        : false,
  },
  async () => {
    if (!testDatabaseUrl) return;

    requireSafeTestDatabaseUrl({
      applicationDatabaseUrl,
      confirmation: process.env.TEST_DATABASE_CONFIRMATION,
      testDatabaseUrl,
    });
    process.env.DATABASE_URL = testDatabaseUrl;

    const [{ prisma }, { gameplayRepository }] = await Promise.all([
      import("@/lib/prisma"),
      import("@/features/gameplay/repositories/gameplay.repository"),
    ]);
    disconnectIntegrationPrisma = () => prisma.$disconnect();

    const authSecret = process.env.BETTER_AUTH_SECRET;
    assert.ok(authSecret, "The local auth secret must be configured for the test.");

    const syntheticUserId = `gameplay-limit-${randomUUID()}`;
    const userDigest = createHmac("sha256", authSecret)
      .update(syntheticUserId)
      .digest("hex");
    const limiterKey = `scripture-memo:gameplay-completion:${userDigest}`;
    const windowStart = new Date("2026-10-07T12:00:00.000Z");

    try {
      assert.equal(
        await prisma.rateLimit.findUnique({ where: { key: limiterKey } }),
        null,
        "The unique integration limiter key must not already exist.",
      );

      // More simultaneous requests than the fixed cap must share one count
      // across independent transactions, rather than each seeing a free slot.
      const simultaneousResults = await Promise.all(
        Array.from({ length: 12 }, () =>
          gameplayRepository.consumeCompletionSubmissionLimit(
            syntheticUserId,
            windowStart,
          ),
        ),
      );

      assert.equal(
        simultaneousResults.filter(Boolean).length,
        10,
        "Only ten concurrent submissions should pass in one minute.",
      );
      assert.equal(
        simultaneousResults.filter((admitted) => !admitted).length,
        2,
        "Excess concurrent submissions should be blocked.",
      );

      const storedLimit = await prisma.rateLimit.findUniqueOrThrow({
        where: { key: limiterKey },
        select: { count: true, lastRequest: true },
      });
      assert.equal(storedLimit.count, 10);
      assert.equal(Number(storedLimit.lastRequest), windowStart.getTime());

      assert.equal(
        await gameplayRepository.consumeCompletionSubmissionLimit(
          syntheticUserId,
          new Date(windowStart.getTime() + 60_000),
        ),
        true,
        "A request at the window boundary should start a fresh allowance.",
      );

      const resetLimit = await prisma.rateLimit.findUniqueOrThrow({
        where: { key: limiterKey },
        select: { count: true, lastRequest: true },
      });
      assert.equal(resetLimit.count, 1);
      assert.equal(
        Number(resetLimit.lastRequest),
        windowStart.getTime() + 60_000,
      );
    } finally {
      // Keep cleanup bounded to this test's non-reversible, synthetic key.
      await prisma.rateLimit.deleteMany({ where: { key: limiterKey } });
    }
  },
);
