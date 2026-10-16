import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { AccountSettingsInput } from "@/features/settings/schemas/update-user-settings.schema";

export type UserSettingsValues = {
  preferredTranslation: TranslationCode;
  timeZone: string;
  hasConfiguredTimeZone: boolean;
  hasSelectedTranslation: boolean;
};

/** Persistence operations owned by the user-settings feature. */
export const settingsRepository = {
  /** Loads only the preferences consumed by the request-scoped settings cache. */
  async getByUserId(userId: string): Promise<UserSettingsValues | null> {
    // WHY: This shared read runs across protected screens. Internal row IDs and
    // audit timestamps are not presentation preferences, so leave them in the
    // database. Keep the same unique owner lookup and missing-row fallback.
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: {
        preferredTranslation: true,
        timeZone: true,
        hasConfiguredTimeZone: true,
        hasSelectedTranslation: true,
      },
    });
    if (!settings) return null;

    return {
      preferredTranslation: settings.preferredTranslation,
      timeZone: settings.timeZone,
      hasConfiguredTimeZone: settings.hasConfiguredTimeZone,
      hasSelectedTranslation: settings.hasSelectedTranslation,
    };
  },

  /**
   * Updates auth display identity, public profile, and private preferences in one
   * transaction so every surface observes a consistent saved configuration.
   */
  async updateForUser(
    userId: string,
    input: AccountSettingsInput,
  ): Promise<void> {
    const currentProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { isPartner: true },
    });
    // WHY: Partner frame authorization uses persisted entitlement. Hiding
    // premium choices in the browser alone would not stop a forged action.
    const authorizedFrameKey = currentProfile?.isPartner
      ? input.avatarFrameKey
      : "default";

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
          avatarKey: input.avatarKey,
          avatarFrameKey: authorizedFrameKey,
        },
        create: {
          userId,
          displayName: input.displayName,
          countryCode: input.countryCode || null,
          avatarKey: input.avatarKey,
          avatarFrameKey: authorizedFrameKey,
        },
      }),
      prisma.userSettings.upsert({
        where: { userId },
        update: {
          preferredTranslation: input.preferredTranslation,
          timeZone: input.timeZone,
          hasConfiguredTimeZone: true,
          hasSelectedTranslation: true,
        },
        create: {
          userId,
          preferredTranslation: input.preferredTranslation,
          timeZone: input.timeZone,
          hasConfiguredTimeZone: true,
          hasSelectedTranslation: true,
        },
      }),
    ]);
  },

  /**
   * Stores browser detection only until any timezone has been configured.
   *
   * A conditional update is intentionally used instead of a read-then-write so
   * two devices cannot race and overwrite the first accepted preference.
   */
  async configureDetectedTimeZone(
    userId: string,
    timeZone: string,
  ): Promise<void> {
    const updated = await prisma.userSettings.updateMany({
      where: { userId, hasConfiguredTimeZone: false },
      data: { timeZone, hasConfiguredTimeZone: true },
    });
    if (updated.count === 0) {
      // Missing legacy settings rows are created, while an existing configured
      // row receives an empty update and therefore retains the learner's choice.
      await prisma.userSettings.upsert({
        where: { userId },
        update: {},
        create: { userId, timeZone, hasConfiguredTimeZone: true },
      });
    }
  },
} as const;
