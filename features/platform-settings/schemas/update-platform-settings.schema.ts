import { z } from "@/lib/zod";

/** Restricts defaults to translations with complete, currently selectable text. */
export const updatePlatformSettingsSchema = z.object({
  defaultTranslation: z.enum(["KJV", "WEB", "BSB"]),
  baseGlowPoints: z.number().int().min(1).max(10_000),
  defaultHintAllowance: z.number().int().min(0).max(100),
  adminCooldownTestingEnabled: z.boolean(),
});

export type UpdatePlatformSettingsInput = z.infer<
  typeof updatePlatformSettingsSchema
>;
