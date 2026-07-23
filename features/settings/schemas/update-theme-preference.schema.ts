import { z } from "zod";

/** Accepts only the three theme names supported by next-themes and the database. */
export const updateThemePreferenceSchema = z.object({
  theme: z.enum(["light", "dark", "system"]),
}).strict();
