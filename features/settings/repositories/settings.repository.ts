import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { UpdateUserSettingsInput } from "@/features/settings/schemas/update-user-settings.schema";

export type UserSettingsValues = {
  preferredTranslation: TranslationCode;
  audioEnabled: boolean;
  reducedMotion: boolean;
  theme: "light" | "dark" | "system";
};

/** Persistence operations owned by the user-settings feature. */
export const settingsRepository = {
  async getByUserId(userId: string): Promise<UserSettingsValues | null> {
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    if (!settings) return null;

    return {
      preferredTranslation: settings.preferredTranslation,
      audioEnabled: settings.audioEnabled,
      reducedMotion: settings.reducedMotion,
      theme:
        settings.theme === "light" || settings.theme === "dark"
          ? settings.theme
          : "system",
    };
  },

  /**
   * Updates auth display identity, public profile, and private preferences in one
   * transaction so every surface observes a consistent saved configuration.
   */
  async updateForUser(
    userId: string,
    input: UpdateUserSettingsInput,
  ): Promise<void> {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { name: input.displayName },
      }),
      prisma.userProfile.upsert({
        where: { userId },
        update: {
          displayName: input.displayName,
          countryCode: input.countryCode || null,
        },
        create: {
          userId,
          displayName: input.displayName,
          countryCode: input.countryCode || null,
        },
      }),
      prisma.userSettings.upsert({
        where: { userId },
        update: {
          preferredTranslation: input.preferredTranslation,
          audioEnabled: input.audioEnabled,
          reducedMotion: input.reducedMotion,
          theme: input.theme,
          hasSelectedTranslation: true,
        },
        create: {
          userId,
          preferredTranslation: input.preferredTranslation,
          audioEnabled: input.audioEnabled,
          reducedMotion: input.reducedMotion,
          theme: input.theme,
          hasSelectedTranslation: true,
        },
      }),
    ]);
  },
} as const;
