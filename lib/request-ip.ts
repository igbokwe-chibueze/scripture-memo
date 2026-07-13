import "server-only";

/**
 * Extracts the first proxy-provided client address for security audit metadata.
 * Headers are read only on the server and the value is length-bounded before it
 * reaches persistence. This is contextual evidence, not a trusted identity.
 */
export function getRequestIp(requestHeaders: Headers): string | null {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || requestHeaders.get("x-real-ip")?.trim();
  return address ? address.slice(0, 64) : null;
}
