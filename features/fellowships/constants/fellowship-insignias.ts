export const FELLOWSHIP_INSIGNIAS = [
  { key: "word-star", labelKey: "insignias.wordStar", column: 0, row: 0 },
  { key: "good-shepherd", labelKey: "insignias.goodShepherd", column: 1, row: 0 },
  { key: "prayer", labelKey: "insignias.prayer", column: 2, row: 0 },
  { key: "fishers", labelKey: "insignias.fishers", column: 3, row: 0 },
  { key: "beacon", labelKey: "insignias.beacon", column: 0, row: 1 },
  { key: "ark", labelKey: "insignias.ark", column: 1, row: 1 },
  { key: "covenant", labelKey: "insignias.covenant", column: 2, row: 1 },
  { key: "crowned-word", labelKey: "insignias.crownedWord", column: 3, row: 1 },
  { key: "lighthouse", labelKey: "insignias.lighthouse", column: 0, row: 2 },
  { key: "living-water", labelKey: "insignias.livingWater", column: 1, row: 2 },
  { key: "calvary", labelKey: "insignias.calvary", column: 2, row: 2 },
  { key: "shield", labelKey: "insignias.shield", column: 3, row: 2 },
] as const;

export type FellowshipInsigniaKey = (typeof FELLOWSHIP_INSIGNIAS)[number]["key"];
export const DEFAULT_FELLOWSHIP_INSIGNIA: FellowshipInsigniaKey = "word-star";

/** Returns a safe catalogue entry for persisted legacy or malformed values. */
export function getFellowshipInsignia(key: string): (typeof FELLOWSHIP_INSIGNIAS)[number] {
  return FELLOWSHIP_INSIGNIAS.find((insignia) => insignia.key === key)
    ?? FELLOWSHIP_INSIGNIAS[0];
}

