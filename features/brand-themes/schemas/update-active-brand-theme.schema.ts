import { z } from "@/lib/zod";
import {
  isBrandThemeId,
  type BrandThemeId,
} from "@/features/brand-themes/constants/brand-themes";

/** Accepts only a theme whose CSS contract has been registered in the app. */
export const updateActiveBrandThemeSchema = z.object({
  themeId: z.custom<BrandThemeId>(isBrandThemeId, {
    message: "Choose a registered brand theme.",
  }),
});

export type UpdateActiveBrandThemeInput = z.infer<
  typeof updateActiveBrandThemeSchema
>;
