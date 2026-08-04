import { z } from "zod";

/**
 * Applies the same password policy used at registration before Better Auth
 * hashes and stores the replacement credential.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, "This reset link is invalid or incomplete."),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128, "Password cannot exceed 128 characters.")
      .regex(/[a-z]/, "Password must contain a lowercase letter.")
      .regex(/[A-Z]/, "Password must contain an uppercase letter.")
      .regex(/[0-9]/, "Password must contain a number.")
      .regex(/[^A-Za-z0-9]/, "Password must contain a special character."),
    confirmPassword: z.string(),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

