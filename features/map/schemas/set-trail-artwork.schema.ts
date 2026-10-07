import { z } from "@/lib/zod";
import { MAP_THEME_IDS } from "@/features/map/data/map-themes";

/** Validates a stable Map A trail number and an optional bundled artwork key. */
export const setTrailArtworkSchema = z.object({
  trailNumber: z.number().int().positive(),
  // Null removes the explicit assignment and restores the repeating sequence.
  themeId: z.enum(MAP_THEME_IDS).nullable(),
});

export type SetTrailArtworkInput = z.infer<typeof setTrailArtworkSchema>;
