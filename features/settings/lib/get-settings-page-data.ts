import "server-only";

import { notFound } from "next/navigation";
import { requireServerSession } from "@/lib/auth/session";
import { userRepository } from "@/features/users/repositories/user.repository";
import { settingsRepository } from "@/features/settings/repositories/settings.repository";
import type { UpdateUserSettingsInput } from "@/features/settings/schemas/update-user-settings.schema";

export type SettingsPageData = {
  formValues: UpdateUserSettingsInput;
  stats: {
    totalGlowPoints: number;
    totalWaypointsCompleted: number;
    totalHintsUsed: number;
    currentStreak: number;
    bestStreak: number;
  };
};

/**
 * Loads the authorized settings composition without exposing email or IDs to the
 * client form. Missing identity state is treated as an invalid page resource.
 */
export async function getSettingsPageData(): Promise<SettingsPageData> {
  const session = await requireServerSession();
  const [profile, settings] = await Promise.all([
    userRepository.getProfileSummary(session.user.id),
    settingsRepository.getByUserId(session.user.id),
  ]);

  if (!profile || !settings) notFound();

  return {
    formValues: {
      displayName: profile.displayName,
      countryCode: profile.countryCode ?? "",
      preferredTranslation: settings.preferredTranslation,
      audioEnabled: settings.audioEnabled,
      reducedMotion: settings.reducedMotion,
      theme: settings.theme,
    },
    stats: {
      totalGlowPoints: profile.totalGlowPoints,
      totalWaypointsCompleted: profile.totalWaypointsCompleted,
      totalHintsUsed: profile.totalHintsUsed,
      currentStreak: profile.currentStreak,
      bestStreak: profile.bestStreak,
    },
  };
}
