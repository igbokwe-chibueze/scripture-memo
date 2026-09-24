import { createHmac } from "node:crypto";

import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/** Database operations owned by authentication and first-login onboarding. */
export const authRepository = {
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
