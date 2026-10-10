import "server-only";

import { cache } from "react";
import { platformSettingsRepository } from "@/features/platform-settings/repositories/platform-settings.repository";
import {
  DEFAULT_BRAND_THEME_ID,
  getBrandThemeId,
  type BrandThemeId,
} from "@/features/brand-themes/constants/brand-themes";

/**
 * Gets the globally active brand for the current server request.
 *
 * React cache deduplicates this small lookup if several server components in
 * the same render request ask for it. It is deliberately request-scoped rather
 * than stale across requests, so a Super Admin's global change takes effect
 * immediately on every app instance without adding a cache service or polling.
 * If the database is briefly unavailable, the known-good default still renders.
 */
export const getActiveBrandTheme = cache(async (): Promise<BrandThemeId> => {
  try {
    return getBrandThemeId(
      await platformSettingsRepository.getActiveBrandThemeId(),
    );
  } catch {
    return DEFAULT_BRAND_THEME_ID;
  }
});
