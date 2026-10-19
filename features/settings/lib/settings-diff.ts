/**
 * Return only changed scalar settings. Inputs are already validated form values;
 * explicit false, zero, and empty country strings must survive the comparison.
 * Comparing against the last acknowledged save prevents stale unrelated fields
 * from overwriting settings changed elsewhere. No I/O or mutation occurs here.
 */
export function getChangedSettings<T extends object>(previous: T, next: T): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (previous[key] !== next[key]) patch[key] = next[key];
  }
  return patch;
}
