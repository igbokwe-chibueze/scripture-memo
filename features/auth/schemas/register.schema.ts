import { z } from "zod";

/**
 * Enforces the public registration contract on both client and server.
 * Better Auth hashes the accepted password; application code never stores it.
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters.")
      .max(50, "Name cannot exceed 50 characters."),
    email: z.email("Enter a valid email address.").trim().toLowerCase(),
    password: z
      .string()
      .min(8, "Password must contain at least 8 characters.")
      .max(128, "Password cannot exceed 128 characters.")
      .regex(/[A-Za-z]/, "Password must contain a letter.")
      .regex(/[0-9]/, "Password must contain a number.")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain a special character.",
      ),
    confirmPassword: z.string(),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
