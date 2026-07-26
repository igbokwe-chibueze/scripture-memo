import { z } from "zod";

/**
 * Accepts only the progression coordinates an administrator may select.
 * The affected learner is deliberately derived from the authenticated session.
 */
export const overrideCooldownSchema = z.object({
  waypointId: z.string().trim().min(1, "Waypoint is required.").max(191),
  dayLevel: z.enum(["GLOW", "RADIANCE"]),
}).strict();
