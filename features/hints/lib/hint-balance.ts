import { DEFAULT_HINT_ALLOWANCE } from "@/lib/constants";

/**
 * Calculates free plus purchased hint entitlement without allowing it below zero.
 */
export function calculateHintBalance(
  usedHints: number,
  purchasedHints = 0,
  startingAllowance = DEFAULT_HINT_ALLOWANCE,
): number {
  if (
    !Number.isInteger(usedHints) || usedHints < 0 ||
    !Number.isInteger(purchasedHints) || purchasedHints < 0 ||
    !Number.isInteger(startingAllowance) || startingAllowance < 0
  ) {
    throw new RangeError("Hint counts must be non-negative integers.");
  }
  return Math.max(0, startingAllowance + purchasedHints - usedHints);
}
