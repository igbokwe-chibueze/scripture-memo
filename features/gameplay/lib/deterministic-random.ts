/**
 * Returns a stable unsigned 32-bit hash for deterministic gameplay generation.
 *
 * FNV-1a is intentionally used as a compact reproducibility primitive, not for
 * security. Gameplay seeds contain server-owned identifiers, while no secret or
 * authorization decision depends on this predictable value.
 */
export function hashGameplaySeed(value: string): number {
  let hash = 0x811c9dc5;

  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

/** Returns a copied array in a stable seed-derived order without mutating input. */
export function deterministicShuffle<T>(
  values: readonly T[],
  seed: string,
): T[] {
  return values
    .map((value, index) => ({
      value,
      index,
      rank: hashGameplaySeed(`${seed}:${index}`),
    }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ value }) => value);
}
