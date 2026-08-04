import { z } from "zod";
import { FELLOWSHIP_INSIGNIAS } from "@/features/fellowships/constants/fellowship-insignias";

const fellowshipName = z.string().trim().min(3, "Enter at least 3 characters.").max(50, "Use 50 characters or fewer.").regex(/^[\p{L}\p{N} .&'’-]+$/u, "Use letters, numbers, spaces, apostrophes, ampersands, or hyphens only.");
const insigniaKey = z.enum(FELLOWSHIP_INSIGNIAS.map((insignia) => insignia.key));

export const createFellowshipSchema = z.object({
  name: fellowshipName,
  description: z.string().trim().max(280, "Use 280 characters or fewer."),
  isPublic: z.boolean(),
  insigniaKey,
});

export const updateFellowshipSchema = createFellowshipSchema.extend({
  fellowshipId: z.string().cuid(),
});

export const joinFellowshipSchema = z.object({ fellowshipId: z.string().cuid() });
export const joinByInviteSchema = z.object({ inviteCode: z.string().trim().min(8).max(64) });
export const cancelJoinRequestSchema = z.object({ requestId: z.string().cuid() });
export const resolveJoinRequestSchema = z.object({
  requestId: z.string().cuid(),
  decision: z.enum(["APPROVE", "REJECT"]),
});
export const leaveFellowshipSchema = z.object({ fellowshipId: z.string().cuid() });
export const regenerateFellowshipInviteSchema = z.object({ fellowshipId: z.string().cuid() });

export type CreateFellowshipInput = z.infer<typeof createFellowshipSchema>;
export type UpdateFellowshipInput = z.infer<typeof updateFellowshipSchema>;
