/** Explicit inputs required before destructive local integration work. */
type TestDatabaseGuardInput = {
  applicationDatabaseUrl: string | undefined;
  confirmation: string | undefined;
  testDatabaseUrl: string | undefined;
};

/** Parse without exposing credentials or permitting remote host overrides. */
function requireLocalConnection(value: string | undefined, label: string): URL {
  if (!value) {
    throw new Error(`${label} is not configured.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL.`);
  }
  if (
    !["postgres:", "postgresql:"].includes(parsed.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
    !parsed.username ||
    !parsed.password
  ) {
    throw new Error(`${label} must be a direct local PostgreSQL URL with credentials.`);
  }
  // A host/port option in the query string must not override the checked URL.
  const allowedOptions = [
    "sslmode",
    "connect_timeout",
    "connection_limit",
    "pool_timeout",
    "schema",
  ];
  for (const key of parsed.searchParams.keys()) {
    if (!allowedOptions.includes(key)) {
      throw new Error(`${label} contains an unsupported connection option.`);
    }
  }
  return parsed;
}

/**
 * Allow only confirmed local test instances on a separate listener. Prisma Local
 * can route different database paths to the same persisted database, so a changed
 * name, credential, or schema is not isolation. Treat loopback aliases equally.
 * No connection or mutation happens here; suites must also check empty fixtures.
 */
export function requireSafeTestDatabaseUrl({
  applicationDatabaseUrl,
  confirmation,
  testDatabaseUrl,
}: TestDatabaseGuardInput): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Integration database operations are disabled in production.");
  }
  if (confirmation !== "scripture-memo-integration-tests") {
    throw new Error("TEST_DATABASE_CONFIRMATION must equal scripture-memo-integration-tests.");
  }
  const application = requireLocalConnection(applicationDatabaseUrl, "DATABASE_URL");
  const integration = requireLocalConnection(testDatabaseUrl, "TEST_DATABASE_URL");
  if ((application.port || "5432") === (integration.port || "5432")) {
    throw new Error("TEST_DATABASE_URL must use a different local port from DATABASE_URL.");
  }
  return integration.href;
}
