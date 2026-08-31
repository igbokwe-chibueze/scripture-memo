import { z } from "zod";

/**
 * Accepts only the curriculum record and fixed game mode selected by an admin.
 * Identity, Journey Stage, verse content, rewards, and timing remain server-owned.
 */
export const startAdminGameplayTestSchema = z
  .object({
    waypointId: z.string().trim().min(1, "Waypoint is required.").max(191),
    gameMode: z.enum(["DRAG_DROP", "PUZZLE", "SWAP", "CUE", "FILL"]),
  })
  .strict();
