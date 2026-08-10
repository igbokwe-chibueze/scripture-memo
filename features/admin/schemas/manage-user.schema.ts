import { z } from "zod";
import { UserRole } from "@/lib/generated/prisma/enums";

const userIdSchema = z.string().trim().min(1).max(128);

/** Validates session revocation for exactly one account. */
export const revokeUserSessionsSchema = z.object({
  userId: userIdSchema,
});

/**
 * Requires an explicit destructive confirmation before account anonymization.
 * The literal prevents an accidental menu tap from reaching the repository.
 */
export const anonymizeUserAccountSchema = z.object({
  userId: userIdSchema,
  confirmation: z.literal("DELETE"),
});

/** Validates the exact account and trusted role requested by a Super Admin. */
export const changeUserRoleSchema = z.object({
  userId: userIdSchema,
  role: z.enum(UserRole),
});

/** Validates both suspension and restoration through one explicit contract. */
export const setUserSuspensionSchema = z
  .object({
    userId: userIdSchema,
    suspended: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.suspended && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Explain why this account is being suspended.",
      });
    }
  });

/** Keeps account search bounded and safe for URL-backed pagination. */
export const adminUserFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  search: z.string().trim().max(100).default(""),
});

/** Bounds predictive email lookup so it cannot become an open-ended user dump. */
export const userEmailSuggestionSchema = z.object({
  query: z.string().trim().toLowerCase().min(3).max(100),
});
