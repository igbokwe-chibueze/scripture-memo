import { PROTECTED_PATH_PREFIXES } from "../constants/protected-paths";

/**
 * Accepts only known internal protected paths as post-login destinations.
 * Absolute URLs, protocol-relative URLs, backslashes, and unknown paths fall
 * back to the game home, preventing the login page from becoming an open redirect.
 */
export function getSafePostLoginPath(candidate: unknown): string {
  if (
    typeof candidate !== "string" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.length > 2048
  ) {
    return "/game";
  }

  const pathname = candidate.split(/[?#]/, 1)[0];
  const isAllowed = PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return isAllowed ? candidate : "/game";
}
