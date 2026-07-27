import { DEFAULT_HINT_ALLOWANCE } from "@/lib/constants";

/**
 * Calculates the persisted free-hint balance without allowing it below zero.
 * Purchased credits remain zero until Phase 22 adds explicit entitlements.
 */
export function calculateHintBalance(usedHints: number): number {
  if (!Number.isInteger(usedHints) || usedHints < 0) {
    throw new RangeError("Used hint count must be a non-negative integer.");
  }
  return Math.max(0, DEFAULT_HINT_ALLOWANCE - usedHints);
}
