import { createHmac, randomUUID } from "node:crypto";

import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/** Database operations owned by authentication and first-login onboarding. */
export const authRepository = {
  /**
   * Replaces the sole active verification-link digest for one normalized
   * address. Only the Better Auth signed token's keyed digest is retained;
   * possession of the database row alone cannot produce a usable link.
   *
   * A PostgreSQL advisory transaction lock serializes concurrent resends so
   * exactly one token becomes current. The shared Better Auth Verification
   * table is reused with an application-specific identifier, avoiding a new
   * schema or database. Expired/replaced rows are removed before the new digest
   * is inserted, and the expiry is supplied by the caller from the configured
   * Better Auth token lifetime.
   */
  async replaceLatestEmailVerificationToken(
    email: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    const identifier = createEmailVerificationIdentifier(email);
    const value = createEmailVerificationTokenDigest(token);
    const now = new Date();

    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${identifier}))
      `;

      await transaction.verification.deleteMany({
        where: { identifier },
      });

      await transaction.verification.create({
        data: {
          id: randomUUID(),
          identifier,
          value,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        },
      });
    });
  },

  /**
   * Checks that a token is the current, unexpired verification link for an
   * address. The request adapter uses this before handing a browser link to
   * Better Auth so replaced links can receive a friendly redirect instead of
   * reaching its API error response.
   */
  async isLatestEmailVerificationToken(
    email: string,
    token: string,
    now: Date,
  ): Promise<boolean> {
    const identifier = createEmailVerificationIdentifier(email);
    const value = createEmailVerificationTokenDigest(token);
    const activeToken = await prisma.verification.findFirst({
      where: {
        identifier,
        value,
        expiresAt: { gt: now },
      },
      select: { id: true },
    });

    return activeToken !== null;
  },

  /**
   * Atomically consumes only the latest unexpired verification token. This is
   * called from Better Auth's before-verification hook, after Better Auth has
   * already checked the JWT signature and expiry. Deleting by both identifier
   * and keyed digest rejects older, reused, or superseded links and makes two
   * concurrent redemption attempts race for the same single database row.
   */
  async consumeLatestEmailVerificationToken(
    email: string,
    token: string,
    now: Date,
  ): Promise<boolean> {
    const identifier = createEmailVerificationIdentifier(email);
    const value = createEmailVerificationTokenDigest(token);

    return prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${identifier}))
      `;

      const consumed = await transaction.verification.deleteMany({
        where: {
          identifier,
          value,
          expiresAt: { gt: now },
        },
      });

      return consumed.count === 1;
    });
  },

  /**
   * Atomically limits password-reset requests for one normalized email address.
   *
   * WHY: Better Auth's configured database limiter protects requests by IP,
   * but an attacker with many network addresses could otherwise repeatedly
   * target one recipient. An HMAC key keeps the email out of rate-limit rows
   * without making likely addresses guessable from a database dump, and a
   * PostgreSQL transaction advisory lock serializes concurrent attempts for
   * that key. The existing Better Auth RateLimit table is reused, so this adds
   * no migration or external storage dependency.
   *
   * The fixed policy is five accepted requests per address in a fixed
   * 15-minute window, matching Better Auth's reset-request cleanup horizon.
   * Blocked attempts do not increment the counter, and the first-request
   * timestamp stays fixed until the window expires. This is an
   * explicit write performed only by the password-reset action; it is never
   * called during ordinary reads. Database failures propagate so the caller
   * can fail closed and return its generic recovery-unavailable message.
   */
  async consumePasswordResetEmailLimit(
    normalizedEmail: string,
    now: Date,
  ): Promise<boolean> {
    const authSecret = process.env.BETTER_AUTH_SECRET;
    if (!authSecret) {
      throw new Error("The auth secret is unavailable for reset throttling.");
    }

    const emailDigest = createHmac("sha256", authSecret)
      .update(normalizedEmail)
      .digest("hex");
    const key = `scripture-memo:password-reset-email:${emailDigest}`;
    const currentTime = BigInt(now.getTime());
    const windowMilliseconds = BigInt(15 * 60 * 1000);
    const maximumRequests = 5;

    return prisma.$transaction(async (transaction) => {
      // WHY: The transaction lock makes the find/check/write sequence atomic
      // for all requests sharing this recipient key across application nodes.
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${key}))
      `;

      const existingLimit = await transaction.rateLimit.findUnique({
        where: { key },
        select: { count: true, lastRequest: true },
      });

      if (!existingLimit) {
        await transaction.rateLimit.create({
          data: {
            key,
            count: 1,
            lastRequest: currentTime,
          },
        });

        return true;
      }

      const hasWindowExpired =
        currentTime - existingLimit.lastRequest >= windowMilliseconds;

      if (!hasWindowExpired && existingLimit.count >= maximumRequests) {
        return false;
      }

      await transaction.rateLimit.update({
        where: { key },
        data: {
          count: hasWindowExpired ? 1 : { increment: 1 },
          ...(hasWindowExpired ? { lastRequest: currentTime } : {}),
        },
      });

      return true;
    });
  },

  /**
   * Rejects suspended identities before Better Auth creates a new session.
   *
   * WHY: Suspension is product authorization state stored beside the Better
   * Auth user. This indexed email lookup occurs only during an explicit login,
   * never on ordinary page reads, so enforcement does not create recurring
   * database cost.
   */
  async isLoginSuspended(email: string, now: Date): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        suspendedAt: true,
        suspendedUntil: true,
      },
    });

    if (!user?.suspendedAt) return false;
    return !user.suspendedUntil || user.suspendedUntil > now;
  },

  /**
   * Creates missing one-to-one player records after Better Auth creates a user.
   * Upserts make registration recovery safe if a prior request created identity
   * but failed before onboarding records were written.
   */
  async ensureUserFoundation(
    userId: string,
    displayName: string,
  ): Promise<void> {
    await prisma.$transaction([
      prisma.userProfile.upsert({
        where: { userId },
        update: {},
        create: { userId, displayName },
      }),
      prisma.userSettings.upsert({
        where: { userId },
        update: {},
        create: { userId },
      }),
      prisma.userStreak.upsert({
        where: { userId },
        update: {},
        create: { userId },
      }),
    ]);
  },

  /** Returns whether the user has completed one-time translation onboarding. */
  async hasSelectedTranslation(userId: string): Promise<boolean> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { hasSelectedTranslation: true },
    });

    return settings?.hasSelectedTranslation ?? false;
  },

  /** Persists the one-time translation choice for the authenticated user. */
  async selectTranslation(
    userId: string,
    translation: TranslationCode,
  ): Promise<void> {
    await prisma.userSettings.upsert({
      where: { userId },
      update: {
        preferredTranslation: translation,
        hasSelectedTranslation: true,
      },
      // WHY: Older or partially onboarded identities may not yet have settings.
      // Upsert repairs that state without forcing the user to register again.
      create: {
        userId,
        preferredTranslation: translation,
        hasSelectedTranslation: true,
      },
    });
  },
} as const;

/** Derives a non-reversible database key for one normalized email address. */
function createEmailVerificationIdentifier(email: string): string {
  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret) {
    throw new Error("The auth secret is unavailable for verification tokens.");
  }

  const addressDigest = createHmac("sha256", authSecret)
    .update(email.trim().toLowerCase())
    .digest("hex");

  return `scripture-memo:email-verification:${addressDigest}`;
}

/** Stores a keyed digest instead of the bearer token itself. */
function createEmailVerificationTokenDigest(token: string): string {
  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret) {
    throw new Error("The auth secret is unavailable for verification tokens.");
  }

  return createHmac("sha256", authSecret)
    .update(`scripture-memo:email-verification-token:${token}`)
    .digest("hex");
}
