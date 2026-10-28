/** Bound every social request to a shipped immutable plan and explicit event.
 * No client identity, chapter arrays, rewards or activity timestamps are accepted. */
import { z } from "zod";

export const readingPlanIdSchema = z.enum(["new-testament", "old-testament"]);
export const readingPlanParticipationSchema = z
  .object({
    planId: readingPlanIdSchema,
    operation: z.enum(["start", "activity", "complete", "reset"]),
  })
  .strict();
export type ReadingPlanParticipationInput = z.infer<
  typeof readingPlanParticipationSchema
>;
