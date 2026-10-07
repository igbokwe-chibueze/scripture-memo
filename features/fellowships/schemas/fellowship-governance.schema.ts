import { z } from "@/lib/zod";

/** Validates the narrowly scoped Fellowship governance mutations. */
const fellowshipId = z.string().cuid();
const password = z.string().min(1).max(128);
const confirmationName = z.string().trim().min(1).max(50);
const reason = z.string().trim().min(15).max(500);

/** Requires the current leader to name a current member and re-enter a password. */
export const requestLeadershipTransferSchema = z.object({
  fellowshipId,
  targetMemberId: z.string().cuid(),
  password,
});

/** Identifies the recipient's pending handoff without accepting client identity. */
export const respondLeadershipTransferSchema = z.object({
  transferId: z.string().cuid(),
  response: z.enum(["ACCEPT", "DECLINE"]),
});

/** Lets the current leader withdraw an outstanding handoff. */
export const cancelLeadershipTransferSchema = z.object({
  transferId: z.string().cuid(),
});

/** Requires current-password confirmation before a cancellable closure begins. */
export const scheduleFellowshipDissolutionSchema = z.object({
  fellowshipId,
  password,
  confirmationName,
});

/** Allows only the initiating current leader to cancel during the grace period. */
export const cancelFellowshipDissolutionSchema = z.object({
  dissolutionId: z.string().cuid(),
});

/** Super Admin recovery operations require an explicit reason and re-authentication. */
export const emergencyFellowshipActionSchema = z.object({
  fellowshipId,
  password,
  confirmationName,
  reason,
});

/** Selects a real current Fellowship member for an emergency ownership change. */
export const emergencyTransferLeadershipSchema = emergencyFellowshipActionSchema.extend({
  targetMemberId: z.string().cuid(),
});

/** Bounds platform-wide moderation search without exposing private accounts. */
export const fellowshipModerationSearchSchema = z.object({
  query: z.string().trim().max(50).default(""),
});

/** Requires a reauthenticated Super Admin and clear suspension reason. */
export const suspendFellowshipSchema = z.object({
  fellowshipId,
  password,
  confirmationName,
  reason,
});

/** Permits one written appeal by the current leader within the 30-day window. */
export const submitFellowshipSuspensionAppealSchema = z.object({
  suspensionId: z.string().cuid(),
  statement: z.string().trim().min(30).max(2_000),
});

/** Requires a reasoned, reauthenticated Super Admin review decision. */
export const resolveFellowshipSuspensionAppealSchema = z.object({
  suspensionId: z.string().cuid(),
  password,
  decision: z.enum(["RESTORE", "UPHOLD"]),
  decisionReason: reason,
});

/** Allows a Super Admin to restore a case even when the leader did not appeal. */
export const restoreFellowshipSuspensionSchema = z.object({
  suspensionId: z.string().cuid(),
  password,
  reason,
});

export type RequestLeadershipTransferInput = z.infer<
  typeof requestLeadershipTransferSchema
>;
export type RespondLeadershipTransferInput = z.infer<
  typeof respondLeadershipTransferSchema
>;
export type ScheduleFellowshipDissolutionInput = z.infer<
  typeof scheduleFellowshipDissolutionSchema
>;
export type EmergencyFellowshipActionInput = z.infer<
  typeof emergencyFellowshipActionSchema
>;
export type EmergencyTransferLeadershipInput = z.infer<
  typeof emergencyTransferLeadershipSchema
>;
