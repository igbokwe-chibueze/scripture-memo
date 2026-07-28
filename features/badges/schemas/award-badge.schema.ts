import { z } from "zod";

/** Validates the exact badge and account selected for a privileged grant. */
export const awardBadgeSchema = z.object({
  badgeId: z.string().cuid(),
  userEmail: z.string().trim().toLowerCase().email().max(254),
});

/** Validates badge availability changes before authorization and persistence. */
export const setBadgeActiveSchema = z.object({
  badgeId: z.string().cuid(),
  isActive: z.boolean(),
});

/** Validates the exact badge requested for permanent deletion. */
export const deleteBadgeSchema = z.object({
  badgeId: z.string().cuid(),
});
