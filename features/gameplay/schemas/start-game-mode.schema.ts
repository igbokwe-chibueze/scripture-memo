import { z } from "zod";

/** Accepts only session identity and the fixed mode requested by the shell. */
export const startGameModeSchema = z.object({
  sessionId: z.string().trim().min(1).max(191),
  gameMode: z.enum(["DRAG_DROP", "PUZZLE", "SWAP", "CUE", "FILL"]),
}).strict();
