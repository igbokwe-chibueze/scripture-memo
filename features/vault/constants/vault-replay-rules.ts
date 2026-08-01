import { DayLevel } from "@/lib/generated/prisma/enums";

/**
 * Approved Vault replay policy.
 *
 * These constants make the product decision explicit and testable: mastered
 * verses replay at Radiance content difficulty, while the repository/gameplay
 * branches deliberately omit timers, hints, campaign mutations, and rewards.
 */
export const VAULT_REPLAY_DAY_LEVEL = DayLevel.RADIANCE;
export const VAULT_REPLAY_IS_TIMED = false;
export const VAULT_REPLAY_HINTS_ALLOWED = false;
