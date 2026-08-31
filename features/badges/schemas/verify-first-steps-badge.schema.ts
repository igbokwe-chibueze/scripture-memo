import { z } from "zod";

/** Validates the Learn waypoint selected for the read-only badge QA check. */
export const verifyFirstStepsBadgeSchema = z.object({
  waypointId: z.string().cuid(),
});
