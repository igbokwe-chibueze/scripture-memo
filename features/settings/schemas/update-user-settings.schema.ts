import { z } from "zod";

/** Validates every editable profile and preference field at the server boundary. */
export const updateUserSettingsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must contain at least 2 characters.")
    .max(50, "Display name cannot exceed 50 characters.")
    .regex(
      /^[\p{L}\p{N} .'-]+$/u,
      "Display name contains unsupported characters.",
    ),
  countryCode: z.union([
    z.literal(""),
    z.string().regex(/^[A-Z]{2}$/, "Select a valid country."),
  ]),
  preferredTranslation: z.enum(["NIV", "ESV", "KJV"]),
  audioEnabled: z.boolean(),
  reducedMotion: z.boolean(),
  theme: z.enum(["light", "dark", "system"]),
});

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;
