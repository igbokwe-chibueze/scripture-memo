/** Canonical handles are ASCII, case-insensitive and independent of display names. */
import { z } from "@/lib/zod";

export const USERNAME_CHANGE_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

/** Normalize handles before validating; the database also enforces this format. */
export const usernameSchema = z.string()
  .trim()
  .transform((value) => value.replace(/^@/, "").toLowerCase())
  .pipe(z.string().min(3).max(24).regex(/^[a-z0-9_]+$/));

/** Only the authenticated account can change its username. */
export const updateUsernameSchema = z.object({ username: usernameSchema }).strict();
