import { z } from "zod";

/** Rejects unknown fields so identity, rewards, and timing cannot be injected. */
export const startGameSessionSchema = z.object({
  waypointId: z.string().trim().min(1, "Waypoint is required.").max(191),
  dayLevel: z.enum(["GLIMMER", "GLOW", "RADIANCE"]),
}).strict();
