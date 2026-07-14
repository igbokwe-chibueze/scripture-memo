import type { MapVariant } from "@/features/map/types/map.types";

/** Parses only the two intentionally supported experiment variants. */
export function parseMapVariant(value: string | null | undefined): MapVariant | null {
  return value === "a" || value === "b" ? value : null;
}

/** URL assignment wins over stored preference so tester links stay deterministic. */
export function resolveMapVariant(
  queryValue: string | null | undefined,
  storedValue: string | null | undefined,
): MapVariant {
  return parseMapVariant(queryValue) ?? parseMapVariant(storedValue) ?? "a";
}
