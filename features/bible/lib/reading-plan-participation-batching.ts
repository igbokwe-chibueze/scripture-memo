/** Pure daily batching policy; server SQL independently enforces UTC throttling.
 * Acknowledgements are account-scoped browser hints, never authorization.
 */
import { z } from "zod";
import { readingPlanParticipationSchema } from "../schemas/reading-plan-participation.schema";
export const participationOperationSchema =
  readingPlanParticipationSchema.shape.operation;
export const participationQueueSchema = z.object({
  ack: z
    .object({
      operation: participationOperationSchema,
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
  pending: z
    .object({
      operation: participationOperationSchema,
      eventId: z.string().min(1).max(80),
    })
    .optional(),
});
export type ParticipationQueue = z.infer<typeof participationQueueSchema>;

/** Start is enrolled once; progress is sent once per UTC day. Completion/reset
 * and undoing completion are explicit transitions and bypass the daily gate. */
export function shouldSyncParticipation(
  operation: z.infer<typeof participationOperationSchema>,
  ack: ParticipationQueue["ack"],
  day: string,
): boolean {
  if (!ack) return true;
  if (operation === "start") return ack.operation === "reset";
  if (operation === "complete" || operation === "reset")
    return ack.operation !== operation;
  return (
    ack.operation === "complete" || ack.operation === "reset" || ack.day !== day
  );
}
