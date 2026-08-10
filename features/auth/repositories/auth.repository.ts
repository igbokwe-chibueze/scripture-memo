import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/** Database operations owned by authentication and first-login onboarding. */
export const authRepository = {
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
