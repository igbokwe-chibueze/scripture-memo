import "server-only";

import { prisma } from "@/lib/prisma";
import { TranslationCode } from "@/lib/generated/prisma/client";
import type { UpdatePlatformSettingsInput } from "@/features/platform-settings/schemas/update-platform-settings.schema";
import { AVAILABLE_TRANSLATION_CODES } from "@/features/verses/constants/translations";
import type { BrandThemeId } from "@/features/brand-themes/constants/brand-themes";
import { getBrandThemeId } from "@/features/brand-themes/constants/brand-themes";

/** Excludes retired/licensed enum values from the platform selection UI. */
function isAvailableTranslation(
  value: TranslationCode,
): value is UpdatePlatformSettingsInput["defaultTranslation"] {
  return (AVAILABLE_TRANSLATION_CODES as readonly string[]).includes(value);
}

/** Safe operational defaults used only if a local database predates migration. */
const FALLBACK_SETTINGS = {
  defaultTranslation: TranslationCode.KJV,
  baseGlowPoints: 100,
  defaultHintAllowance: 5,
  adminCooldownTestingEnabled: true,
};

/** Repository boundary for global settings and read-only reward defaults. */
export const platformSettingsRepository = {
  /** Reads the globally selected registered brand, without creating rows. */
  async getActiveBrandThemeId(): Promise<BrandThemeId> {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "global" },
      select: { activeBrandThemeId: true },
    });

    return getBrandThemeId(settings?.activeBrandThemeId);
  },

  /** Saves the global brand and its audit record atomically. */
  async updateActiveBrandTheme({
    actorId,
    ipAddress,
    themeId,
  }: {
    actorId: string;
    ipAddress: string | null;
    themeId: BrandThemeId;
  }): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const before = await transaction.platformSettings.upsert({
        where: { id: "global" },
        update: {},
        create: {},
        select: { activeBrandThemeId: true },
      });

      await transaction.platformSettings.update({
        where: { id: "global" },
        data: { activeBrandThemeId: themeId },
      });

      await transaction.auditLog.create({
        data: {
          actorId,
          action: "PLATFORM_BRAND_THEME_UPDATED",
          entityType: "PlatformSettings",
          entityId: "global",
          ipAddress,
          metadata: {
            previous: { activeBrandThemeId: before.activeBrandThemeId },
            next: { activeBrandThemeId: themeId },
          },
        },
      });
    });
  },

  /** Reads the single platform row without performing initialization writes. */
  async get(): Promise<UpdatePlatformSettingsInput> {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "global" },
      select: {
        defaultTranslation: true,
        baseGlowPoints: true,
        defaultHintAllowance: true,
        adminCooldownTestingEnabled: true,
      },
    });

    return {
      defaultTranslation:
        settings && isAvailableTranslation(settings.defaultTranslation)
          ? settings.defaultTranslation
          : FALLBACK_SETTINGS.defaultTranslation,
      baseGlowPoints: settings?.baseGlowPoints ?? FALLBACK_SETTINGS.baseGlowPoints,
      defaultHintAllowance:
        settings?.defaultHintAllowance ?? FALLBACK_SETTINGS.defaultHintAllowance,
      adminCooldownTestingEnabled:
        settings?.adminCooldownTestingEnabled ??
        FALLBACK_SETTINGS.adminCooldownTestingEnabled,
    };
  },

  /** Saves global defaults and the immutable audit evidence atomically. */
  async update({
    actorId,
    ipAddress,
    input,
  }: {
    actorId: string;
    ipAddress: string | null;
    input: UpdatePlatformSettingsInput;
  }): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const before = await transaction.platformSettings.upsert({
        where: { id: "global" },
        update: {},
        create: {},
        select: {
          defaultTranslation: true,
          baseGlowPoints: true,
          defaultHintAllowance: true,
          adminCooldownTestingEnabled: true,
        },
      });

      await transaction.platformSettings.update({
        where: { id: "global" },
        data: input,
      });

      await transaction.auditLog.create({
        data: {
          actorId,
          action: "PLATFORM_SETTINGS_UPDATED",
          entityType: "PlatformSettings",
          entityId: "global",
          ipAddress,
          metadata: {
            previous: before,
            next: input,
          },
        },
      });
    });
  },
} as const;
