import { z } from "zod";

/** Accepts only the learner-owned gameplay session selected for hint QA. */
export const verifyHintQaSchema = z
  .object({
    sessionId: z.string().trim().min(1, "Session is required.").max(191),
  })
  .strict();
