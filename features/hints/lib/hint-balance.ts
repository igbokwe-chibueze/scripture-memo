import { DEFAULT_HINT_ALLOWANCE } from "@/lib/constants";

/**
 * Calculates free plus purchased hint entitlement without allowing it below zero.
 */
export function calculateHintBalance(usedHints: number, purchasedHints = 0): number {
  if (
    !Number.isInteger(usedHints) || usedHints < 0 ||
    !Number.isInteger(purchasedHints) || purchasedHints < 0
  ) {
    throw new RangeError("Hint counts must be non-negative integers.");
  }
  return Math.max(0, DEFAULT_HINT_ALLOWANCE + purchasedHints - usedHints);
}
