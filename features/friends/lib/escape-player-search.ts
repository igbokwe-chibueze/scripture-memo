/**
 * Prisma prefix filters use PostgreSQL LIKE/ILIKE. Treat user-entered percent,
 * underscore and backslash as literal name characters, never wildcard operators.
 * Parameter binding still owns SQL safety; escaping preserves search semantics.
 */
export function escapePlayerSearch(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
