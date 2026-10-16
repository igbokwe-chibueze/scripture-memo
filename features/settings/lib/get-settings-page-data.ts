import "server-only";
import { getLocale } from "next-intl/server";
import { isSupportedLocale } from "@/i18n/config";
import { devicePreferencesSchema } from "./device-preferences";

import { notFound } from "next/navigation";
import { requireServerSession } from "@/lib/auth/session";
import { userRepository } from "@/features/users/repositories/user.repository";
import { getCachedUserSettings } from "@/features/settings/lib/get-cached-user-settings";
import type { UpdateUserSettingsInput } from "@/features/settings/schemas/update-user-settings.schema";

const selectableTranslations = new Set(["KJV", "WEB", "BSB"]);

export type SettingsPageData = {
  formValues: UpdateUserSettingsInput;
  stats: {
    totalGlowPoints: number;
    totalWaypointsCompleted: number;
    totalHintsUsed: number;
    currentStreak: number;
    bestStreak: number;
  };
  isPartner: boolean;
};

/**
 * Loads the authorized settings composition without exposing email or IDs to the
 * client form. Missing identity state is treated as an invalid page resource.
 */
export async function getSettingsPageData(): Promise<SettingsPageData> {
  const session = await requireServerSession();
  const [profile, settings, locale] = await Promise.all([
    userRepository.getProfileSummary(session.user.id),
    getCachedUserSettings(session.user.id),
    getLocale(),
  ]);

  if (!profile || !settings) notFound();

  return {
    formValues: {
      displayName: profile.displayName,
      countryCode: profile.countryCode ?? "",
      avatarKey: profile.avatarKey,
      avatarFrameKey: profile.avatarFrameKey,
      // Existing accounts may still hold a future licensed code. Until that
      // text is available, the settings form safely presents public-domain KJV.
      preferredTranslation: selectableTranslations.has(settings.preferredTranslation)
        ? (settings.preferredTranslation as "KJV" | "WEB" | "BSB")
        : "KJV",
      ...devicePreferencesSchema.parse({}),
      locale: isSupportedLocale(locale) ? locale : "en",
      timeZone: settings.timeZone,
    },
    stats: {
      totalGlowPoints: profile.totalGlowPoints,
      totalWaypointsCompleted: profile.totalWaypointsCompleted,
      totalHintsUsed: profile.totalHintsUsed,
      currentStreak: profile.currentStreak,
      bestStreak: profile.bestStreak,
    },
    isPartner: profile.isPartner,
  };
}
