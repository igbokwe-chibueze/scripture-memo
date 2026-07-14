import type { MapVariant } from "@/features/map/types/map.types";

/**
 * Parses an untrusted URL or browser-storage value into a supported variant.
 * Returning null instead of coercing arbitrary strings prevents stale tester
 * links from silently selecting an unintended presentation.
 */
export function parseMapVariant(value: string | null | undefined): MapVariant | null {
  return value === "a" || value === "b" ? value : null;
}

/**
 * Resolves presentation precedence for comparative testing.
 *
 * A valid URL assignment wins so a researcher can send deterministic Map A or
 * Map B links. Stored preference provides continuity for ordinary switching,
 * while Map A is the stable safe default for first visits, invalid values, and
 * browsers where storage is unavailable.
 */
export function resolveMapVariant(
  queryValue: string | null | undefined,
  storedValue: string | null | undefined,
): MapVariant {
  return parseMapVariant(queryValue) ?? parseMapVariant(storedValue) ?? "a";
}
