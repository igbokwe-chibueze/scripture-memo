/**
 * Default LAN origin used for physical-device testing on the current network.
 *
 * `DEV_ALLOWED_ORIGINS` may replace this value with a comma-separated list when
 * the development computer receives a different LAN address. Production never
 * consumes these origins; both Next.js and Better Auth apply them only in local
 * development.
 */
const DEFAULT_DEVELOPMENT_ORIGINS = ["http://192.168.100.11:3000"] as const;

/** Returns normalized HTTP(S) origins that are safe to share between dev tools. */
export function getDevelopmentOrigins(): string[] {
  const configuredOrigins = process.env.DEV_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const candidates = configuredOrigins?.length
    ? configuredOrigins
    : [...DEFAULT_DEVELOPMENT_ORIGINS];

  return candidates.flatMap((candidate) => {
    try {
      // Normalizing through URL removes paths and trailing slashes. Better Auth
      // compares origins, so accepting arbitrary paths would be misleading.
      const parsed = new URL(candidate);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return [];
      return [parsed.origin];
    } catch {
      // A malformed optional environment value is ignored safely rather than
      // weakening origin validation with a partial or wildcard match.
      return [];
    }
  });
}

/** Next.js expects development hostnames, while Better Auth expects full origins. */
export function getDevelopmentHostnames(): string[] {
  return getDevelopmentOrigins().map((origin) => new URL(origin).hostname);
}
