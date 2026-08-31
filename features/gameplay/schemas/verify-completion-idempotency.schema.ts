import { z } from "zod";
import { DayLevel } from "@/lib/generated/prisma/enums";

/** Validates the completed challenge day selected for an administrator QA probe. */
export const verifyCompletionIdempotencySchema = z.object({
  waypointId: z.string().cuid(),
  dayLevel: z.enum(DayLevel),
});

