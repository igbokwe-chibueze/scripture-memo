import type { Prisma } from "@/lib/generated/prisma/client";
import type { TranslationCode } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { AccountSettingsPatch } from "@/features/settings/schemas/update-user-settings.schema";
import { isFreeAvatar } from "@/features/profile/data/avatar-catalog";

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
   * Persist only requested fields and affected records. Display-name changes need
   * an atomic auth/profile update; one-record edits avoid a transaction. Entitlement
   * and missing-row recovery reads are scoped to the affected profile only.
   */
  async updateForUser(userId: string, input: AccountSettingsPatch): Promise<void> {
    // Never trust a forged Settings payload to equip a paid portrait. Ownership
    // is permanent, so this read remains valid through the subsequent save.
    if (input.avatarKey !== undefined && !isFreeAvatar(input.avatarKey)) {
      const owned = await prisma.userAvatarOwnership.findUnique({
        where: { userId_avatarKey: { userId, avatarKey: input.avatarKey } },
        select: { avatarKey: true },
      });
      if (!owned) throw new Error("Purchase this avatar in the shop before equipping it.");
    }
    const writes: Prisma.PrismaPromise<unknown>[] = [];
    const profileChanged = input.displayName !== undefined || input.countryCode !== undefined ||
      input.avatarKey !== undefined || input.avatarFrameKey !== undefined;
    if (profileChanged) {
      const profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: { displayName: true, isPartner: true },
      });
      // Recover a missing legacy profile only on this explicit save, using trusted identity.
      const owner = profile ? null : await prisma.user.findUnique({
        where: { id: userId }, select: { name: true },
      });
      if (!profile && !owner) throw new Error("Account is unavailable.");
      const profilePatch = {
        ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
        ...(input.countryCode !== undefined ? { countryCode: input.countryCode || null } : {}),
        ...(input.avatarKey !== undefined ? { avatarKey: input.avatarKey } : {}),
        ...(input.avatarFrameKey !== undefined ? {
          avatarFrameKey: profile?.isPartner ? input.avatarFrameKey : "default",
        } : {}),
      };
      if (input.displayName !== undefined) {
        writes.push(prisma.user.update({
          where: { id: userId }, data: { name: input.displayName },
        }));
      }
      writes.push(prisma.userProfile.upsert({
        where: { userId },
        update: profilePatch,
        create: {
          userId,
          ...profilePatch,
          displayName: input.displayName ?? profile?.displayName ?? owner?.name ?? "Player",
        },
      }));
    }
    if (input.preferredTranslation !== undefined || input.timeZone !== undefined) {
      const settingsPatch = {
        ...(input.preferredTranslation !== undefined ? {
          preferredTranslation: input.preferredTranslation, hasSelectedTranslation: true,
        } : {}),
        ...(input.timeZone !== undefined ? {
          timeZone: input.timeZone, hasConfiguredTimeZone: true,
        } : {}),
      };
      writes.push(prisma.userSettings.upsert({
        where: { userId },
        update: settingsPatch,
        create: { userId, ...settingsPatch },
      }));
    }
    if (writes.length === 1) await writes[0];
    else if (writes.length > 1) await prisma.$transaction(writes);
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
