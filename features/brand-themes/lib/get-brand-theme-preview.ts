import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import {
  BRAND_THEME_PREVIEW_COOKIE,
  isBrandThemeId,
  type BrandThemeId,
} from "@/features/brand-themes/constants/brand-themes";

/**
 * Reads a validated temporary theme override from the current browser cookie.
 *
 * This request-scoped helper lets a Super Admin inspect other pages and reload
 * the browser without changing the database setting seen by other players.
 * Invalid or expired values are ignored and cannot introduce arbitrary CSS.
 */
export const getBrandThemePreview = cache(
  async (): Promise<BrandThemeId | null> => {
    const cookieStore = await cookies();
    const previewThemeId = cookieStore.get(BRAND_THEME_PREVIEW_COOKIE)?.value;

    return isBrandThemeId(previewThemeId) ? previewThemeId : null;
  },
);
