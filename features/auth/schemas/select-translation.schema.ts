import { z } from "zod";

/** Restricts onboarding selection to the three translations supported at MVP. */
export const selectTranslationSchema = z.object({
  translation: z.enum(["NIV", "ESV", "KJV"], {
    error: "Select a supported Bible translation.",
  }),
});

export type SelectTranslationInput = z.infer<typeof selectTranslationSchema>;
