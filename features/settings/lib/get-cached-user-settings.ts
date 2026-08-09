import "server-only";

import { cache } from "react";
import { settingsRepository } from "@/features/settings/repositories/settings.repository";
import type { UserSettingsValues } from "@/features/settings/repositories/settings.repository";

/**
 * Shares one settings read across callers participating in the same render.
 *
 * WHY: Locale fallback, the protected application shell, and the Settings page
 * can all need the same row. React's request/render-scoped cache deduplicates
 * that read without allowing one learner's private preferences to leak into a
 * later request or become stale in a process-wide cache.
 */
export const getCachedUserSettings = cache(
  async (userId: string): Promise<UserSettingsValues | null> =>
    settingsRepository.getByUserId(userId),
);
