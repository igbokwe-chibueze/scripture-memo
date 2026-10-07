/**
 * PostgreSQL integration coverage for the auth repository's address-scoped
 * password-reset limiter and latest-link-only email-verification token state.
 *
 * Run only with TEST_DATABASE_URL and TEST_DATABASE_CONFIRMATION pointing to
 * the dedicated local integration database. The test uses a unique synthetic
 * address, removes only its hashed limiter key in `finally`, and refuses to
 * connect when the database guard detects the development or hosted database.
 * These tests verify the accepted-request cap, fixed-window boundary, token
 * replacement, expiry, and single-use behavior in actual PostgreSQL rather
 * than mocks. Run only against the isolated local integration database.
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createHmac, randomUUID } from "node:crypto";
import "dotenv/config";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;
let disconnectIntegrationPrisma: (() => Promise<void>) | undefined;

after(async () => {
  await disconnectIntegrationPrisma?.();
});

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
    disconnectIntegrationPrisma = () => prisma.$disconnect();
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
    }
  },
);

test(
  "email verification resends replace the earlier token and token use is single-use",
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
    disconnectIntegrationPrisma = () => prisma.$disconnect();
    const uniqueEmail = `verification-${randomUUID()}@example.test`;
    const authSecret = process.env.BETTER_AUTH_SECRET;
    assert.ok(authSecret, "The local auth secret must be configured for the test.");
    const addressDigest = createHmac("sha256", authSecret)
      .update(uniqueEmail)
      .digest("hex");
    const verificationIdentifier =
      `scripture-memo:email-verification:${addressDigest}`;
    const firstToken = `first-${randomUUID()}`;
    const secondToken = `second-${randomUUID()}`;
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const now = new Date();

    try {
      assert.equal(
        await prisma.verification.findFirst({
          where: { identifier: verificationIdentifier },
          select: { id: true },
        }),
        null,
        "The synthetic email's verification state must start empty.",
      );

      await authRepository.replaceLatestEmailVerificationToken(
        uniqueEmail,
        firstToken,
        futureExpiry,
      );
      assert.equal(
        await authRepository.isLatestEmailVerificationToken(
          uniqueEmail,
          firstToken,
          now,
        ),
        true,
      );

      await authRepository.replaceLatestEmailVerificationToken(
        uniqueEmail,
        secondToken,
        futureExpiry,
      );
      assert.equal(
        await authRepository.isLatestEmailVerificationToken(
          uniqueEmail,
          firstToken,
          now,
        ),
        false,
        "A resend must make the earlier link inactive immediately.",
      );
      assert.equal(
        await authRepository.isLatestEmailVerificationToken(
          uniqueEmail,
          secondToken,
          now,
        ),
        true,
      );
      assert.equal(
        await authRepository.consumeLatestEmailVerificationToken(
          uniqueEmail,
          firstToken,
          now,
        ),
        false,
      );
      assert.equal(
        await authRepository.consumeLatestEmailVerificationToken(
          uniqueEmail,
          secondToken,
          now,
        ),
        true,
      );
      assert.equal(
        await authRepository.consumeLatestEmailVerificationToken(
          uniqueEmail,
          secondToken,
          now,
        ),
        false,
        "A successfully used verification link cannot be used again.",
      );

      const expiredToken = `expired-${randomUUID()}`;
      await authRepository.replaceLatestEmailVerificationToken(
        uniqueEmail,
        expiredToken,
        new Date(now.getTime() - 1),
      );
      assert.equal(
        await authRepository.isLatestEmailVerificationToken(
          uniqueEmail,
          expiredToken,
          now,
        ),
        false,
      );
    } finally {
      // Scope cleanup to the HMAC-derived identifier for this test address.
      await prisma.verification.deleteMany({
        where: { identifier: verificationIdentifier },
      });
    }
  },
);
