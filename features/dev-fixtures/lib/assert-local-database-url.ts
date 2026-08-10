/**
 * Exact loopback hostnames accepted by destructive or fixture-oriented local tools.
 * Named hosts, private-network addresses, and Prisma cloud URLs are rejected because
 * they could resolve to shared infrastructure outside the developer's machine.
 */
const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Proves that a fixture command targets a loopback PostgreSQL database.
 *
 * WHY: Environment names such as `development` are not a security boundary. A
 * developer can accidentally leave a hosted DATABASE_URL in `.env`. Validating
 * the actual protocol and hostname before constructing Prisma Client makes these
 * commands fail closed before any database connection or write can occur.
 */
export function assertLocalDatabaseUrl(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for local fixture commands.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (!["postgres:", "postgresql:"].includes(parsedUrl.protocol)) {
    throw new Error("Local fixtures require a direct PostgreSQL connection URL.");
  }

  if (!LOCAL_DATABASE_HOSTS.has(parsedUrl.hostname.toLowerCase())) {
    throw new Error(
      "Local fixtures are blocked because DATABASE_URL is not a loopback database.",
    );
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Local fixtures are disabled when NODE_ENV is production.");
  }

  return databaseUrl;
}
