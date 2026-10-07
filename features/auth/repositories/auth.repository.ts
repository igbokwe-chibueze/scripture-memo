import { createHmac, randomUUID } from "node:crypto";

import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * Fixed limits for Server Actions that call Better Auth internally.
 *
 * Better Auth's HTTP middleware does not run for `auth.api.*` calls made
 * directly by a Server Action, so those boundaries need an explicit shared
 * limiter. Keep policy values here, beside the database enforcement, so a
 * caller cannot accidentally choose a weaker cap.
 */
const AUTH_ACTION_RATE_LIMITS = {
  login: { maximumRequests: 10, windowMilliseconds: 15 * 60 * 1000 },
  registration: { maximumRequests: 5, windowMilliseconds: 60 * 60 * 1000 },
  passwordResetRequest: {
    maximumRequests: 5,
    windowMilliseconds: 15 * 60 * 1000,
  },
  passwordResetComplete: {
    maximumRequests: 10,
    windowMilliseconds: 15 * 60 * 1000,
  },
} as const;

export type AuthActionRateLimitScope = keyof typeof AUTH_ACTION_RATE_LIMITS;

/** Database operations owned by authentication and first-login onboarding. */
export const authRepository = {
  /**
   * Removes lingering sessions after a database-backed session read confirms
   * that the owner is banned.
   *
   * WHY: Admin suspension already updates the ban and deletes all sessions in
   * one transaction. This narrow cleanup closes the sign-in/suspension race:
   * if a session was created just as that transaction committed, it cannot
   * become usable again after a later restoration.
   */
  async revokeSessionsForBannedUser(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        userId,
        user: { banned: true },
      },
    });
  },

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

    // Preserve the established key format so an active email window does not
    // reset when this limiter is refactored or deployed.
    const emailDigest = createHmac("sha256", authSecret)
      .update(normalizedEmail)
      .digest("hex");
    const key = `scripture-memo:password-reset-email:${emailDigest}`;

    return consumeFixedWindowRateLimit(key, now, 5, 15 * 60 * 1000);
  },

  /**
   * Atomically applies a shared per-IP cap to a custom Better Auth action.
   *
   * The action scope is part of the HMAC input, so a login attempt does not
   * consume the registration or password-reset allowance. Raw IP addresses
   * are never persisted. Requests without a proxy address share one fallback
   * bucket, which fails closed until the production host's trusted proxy
   * behavior is verified. The database transaction lock makes concurrent
   * calls across application instances consume one common fixed window.
   */
  async consumeAuthActionRateLimit(
    scope: AuthActionRateLimitScope,
    clientIp: string | null,
    now: Date,
  ): Promise<boolean> {
    const policy = AUTH_ACTION_RATE_LIMITS[scope];
    const normalizedIp = clientIp?.trim().toLowerCase() || "unresolved-ip";
    const key = createRateLimitKey(`auth-action:${scope}`, normalizedIp);

    return consumeFixedWindowRateLimit(
      key,
      now,
      policy.maximumRequests,
      policy.windowMilliseconds,
    );
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
    await prisma.$transaction(async (transaction) => {
      const existingFoundation = await transaction.user.findUnique({
        where: { id: userId },
        select: {
          profile: { select: { id: true } },
          settings: { select: { id: true } },
        },
      });
      const needsProfileDefaults = !existingFoundation?.profile;
      const needsTranslationDefault = !existingFoundation?.settings;
      const platformDefaults =
        needsProfileDefaults || needsTranslationDefault
          ? await transaction.platformSettings.findUnique({
              where: { id: "global" },
              select: {
                defaultTranslation: true,
                defaultHintAllowance: true,
              },
            })
          : null;

      await Promise.all([
        transaction.userProfile.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            displayName,
            startingHintAllowance:
              platformDefaults?.defaultHintAllowance ?? 5,
          },
        }),
        transaction.userSettings.upsert({
          where: { userId },
          update: {},
          create: {
            userId,
            preferredTranslation:
              platformDefaults?.defaultTranslation ?? "KJV",
          },
        }),
        transaction.userStreak.upsert({
          where: { userId },
          update: {},
          create: { userId },
        }),
      ]);
    });
  },

  /** Returns whether the user has completed one-time translation onboarding. */
  async hasSelectedTranslation(userId: string): Promise<boolean> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { hasSelectedTranslation: true },
    });

    return settings?.hasSelectedTranslation ?? false;
  },

  /** Supplies a new learner's saved platform default to translation onboarding. */
  async getTranslationOnboardingSettings(userId: string): Promise<{
    hasSelectedTranslation: boolean;
    preferredTranslation: TranslationCode;
  }> {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        hasSelectedTranslation: true,
        preferredTranslation: true,
      },
    });

    return {
      hasSelectedTranslation: settings?.hasSelectedTranslation ?? false,
      preferredTranslation: settings?.preferredTranslation ?? "KJV",
    };
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

/**
 * Stores the supplied identifier as an HMAC so addresses and IPs do not appear
 * in the shared Better Auth RateLimit table or database diagnostics.
 */
function createRateLimitKey(namespace: string, identifier: string): string {
  const authSecret = process.env.BETTER_AUTH_SECRET;
  if (!authSecret) {
    throw new Error("The auth secret is unavailable for rate limiting.");
  }

  const digest = createHmac("sha256", authSecret)
    .update(`${namespace}:${identifier}`)
    .digest("hex");

  return `scripture-memo:${namespace}:${digest}`;
}

/**
 * Consumes one fixed-window allowance using an atomic PostgreSQL transaction.
 *
 * The advisory lock serializes the read/check/write sequence across all app
 * instances. The first accepted request anchors the window; blocked calls do
 * not extend it or increment the count. This is an explicit write used only
 * from mutation boundaries, never from an ordinary read request.
 */
async function consumeFixedWindowRateLimit(
  key: string,
  now: Date,
  maximumRequests: number,
  windowMilliseconds: number,
): Promise<boolean> {
  const currentTime = BigInt(now.getTime());
  const windowDuration = BigInt(windowMilliseconds);

  return prisma.$transaction(async (transaction) => {
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
      currentTime - existingLimit.lastRequest >= windowDuration;

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
}

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
