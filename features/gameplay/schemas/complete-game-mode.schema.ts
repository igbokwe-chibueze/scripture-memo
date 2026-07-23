import { z } from "zod";

/**
 * Validates a mode submission without accepting score, duration, or rewards.
 *
 * The submitted answer is only evidence to evaluate; the repository retrieves
 * the trusted verse translation and authoritative attempt timing itself.
 */
export const completeGameModeSchema = z.object({
  sessionId: z.string().trim().min(1).max(191),
  attemptId: z.string().trim().min(1).max(191),
  gameMode: z.enum(["DRAG_DROP", "PUZZLE", "SWAP", "CUE", "FILL"]),
  submittedAnswer: z.string().trim().min(1).max(10_000),
}).strict();
