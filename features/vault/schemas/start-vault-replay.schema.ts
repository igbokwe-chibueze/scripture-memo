import { z } from "zod";

/** Accepts only a bounded opaque verse identifier; mastery is checked server-side. */
export const startVaultReplaySchema = z.object({
  verseId: z.string().trim().min(1, "Verse is required.").max(191),
});
