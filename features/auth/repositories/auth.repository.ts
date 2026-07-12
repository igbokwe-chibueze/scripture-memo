import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/** Database operations owned by authentication and first-login onboarding. */
export const authRepository = {
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
    await prisma.userSettings.update({
      where: { userId },
      data: {
        preferredTranslation: translation,
        hasSelectedTranslation: true,
      },
    });
  },
} as const;
