import { z } from "zod";

/** Validates a recovery address before Better Auth receives it. */
export const requestPasswordResetSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

