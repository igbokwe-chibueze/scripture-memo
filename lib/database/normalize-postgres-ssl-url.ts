const LEGACY_STRICT_SSL_MODES = new Set([
  "prefer",
  "require",
  "verify-ca",
]);

/**
 * Makes node-postgres certificate verification behavior explicit.
 *
 * Current pg releases treat `prefer`, `require`, and `verify-ca` as aliases for
 * `verify-full` unless libpq compatibility was explicitly requested. A future
 * major release will weaken those aliases to standard libpq semantics. Rewriting
 * only the ambiguous modes preserves today's hostname and certificate checks,
 * removes the deprecation warning, and keeps future upgrades secure.
 *
 * The function never logs or returns URL fragments separately because database
 * URLs commonly contain credentials. Invalid URLs throw a generic message that
 * does not echo the secret input.
 */
export function normalizePostgresSslUrl(connectionString: string): string {
  let databaseUrl: URL;

  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  const usesLibpqCompatibility =
    databaseUrl.searchParams.get("uselibpqcompat") === "true";
  const sslMode = databaseUrl.searchParams.get("sslmode")?.toLowerCase();

  // An explicit libpq compatibility request is an intentional choice and must
  // not be silently changed by application configuration.
  if (
    !usesLibpqCompatibility &&
    sslMode &&
    LEGACY_STRICT_SSL_MODES.has(sslMode)
  ) {
    databaseUrl.searchParams.set("sslmode", "verify-full");
  }

  return databaseUrl.toString();
}
