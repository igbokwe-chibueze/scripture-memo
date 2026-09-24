/**
 * PostgreSQL integration coverage for the per-address password-reset limiter.
 *
 * Run only with TEST_DATABASE_URL and TEST_DATABASE_CONFIRMATION pointing to
 * the dedicated local integration database. The test uses a unique synthetic
 * address, removes only its hashed limiter key in `finally`, and refuses to
 * connect when the database guard detects the development or hosted database.
 * This verifies that the accepted-request cap and fixed-window boundary are
 * enforced by the actual PostgreSQL transaction rather than a mock.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createHmac, randomUUID } from "node:crypto";
import "dotenv/config";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;

test(
  "password reset email limiter caps requests and resets at the fixed window boundary",
  { skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not configured." },
  async () => {
    if (!testDatabaseUrl) return;

    requireSafeTestDatabaseUrl({
      applicationDatabaseUrl,
      confirmation: process.env.TEST_DATABASE_CONFIRMATION,
      testDatabaseUrl,
    });
    process.env.DATABASE_URL = testDatabaseUrl;

    const [{ prisma }, { authRepository }] = await Promise.all([
      import("@/lib/prisma"),
      import("@/features/auth/repositories/auth.repository"),
    ]);
    const uniqueAddress = `reset-limit-${randomUUID()}@example.test`;
    const authSecret = process.env.BETTER_AUTH_SECRET;
    assert.ok(authSecret, "The local auth secret must be configured for the test.");
    const emailDigest = createHmac("sha256", authSecret)
      .update(uniqueAddress)
      .digest("hex");
    const limiterKey = `scripture-memo:password-reset-email:${emailDigest}`;
    const windowStart = new Date("2026-09-24T12:00:00.000Z");

    try {
      // Existing state with this cryptographically unique key would indicate
      // an unexpected collision or an incomplete prior cleanup; fail safely.
      assert.equal(
        await prisma.rateLimit.findUnique({ where: { key: limiterKey } }),
        null,
        "The unique integration limiter key must not already exist.",
      );

      for (let requestNumber = 0; requestNumber < 5; requestNumber += 1) {
        const admitted = await authRepository.consumePasswordResetEmailLimit(
          uniqueAddress,
          new Date(windowStart.getTime() + requestNumber * 60_000),
        );
        assert.equal(admitted, true, `Request ${requestNumber + 1} should pass.`);
      }

      const blocked = await authRepository.consumePasswordResetEmailLimit(
        uniqueAddress,
        new Date(windowStart.getTime() + 5 * 60_000),
      );
      assert.equal(blocked, false, "The sixth request should be blocked.");

      const storedLimit = await prisma.rateLimit.findUniqueOrThrow({
        where: { key: limiterKey },
        select: { count: true, lastRequest: true },
      });
      assert.equal(storedLimit.count, 5, "Blocked requests must not increment the count.");
      assert.equal(
        Number(storedLimit.lastRequest),
        windowStart.getTime(),
        "The fixed window must remain anchored at its first accepted request.",
      );

      const admittedAfterExpiry = await authRepository.consumePasswordResetEmailLimit(
        uniqueAddress,
        new Date(windowStart.getTime() + 15 * 60_000),
      );
      assert.equal(admittedAfterExpiry, true, "A request at expiry starts a new window.");

      const resetLimit = await prisma.rateLimit.findUniqueOrThrow({
        where: { key: limiterKey },
        select: { count: true, lastRequest: true },
      });
      assert.equal(resetLimit.count, 1);
      assert.equal(
        Number(resetLimit.lastRequest),
        windowStart.getTime() + 15 * 60_000,
      );
    } finally {
      // Scope cleanup to the exact non-reversible digest for this test address.
      await prisma.rateLimit.deleteMany({ where: { key: limiterKey } });
      await prisma.$disconnect();
    }
  },
);
