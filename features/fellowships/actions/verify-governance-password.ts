import "server-only";

import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth/auth";
import { rateLimit } from "@/lib/rate-limit";

const GOVERNANCE_PASSWORD_LIMIT = 10;
const GOVERNANCE_PASSWORD_WINDOW_MS = 15 * 60 * 1000;

/**
 * Re-checks the authenticated user's credential with Better Auth before a
 * destructive Fellowship action. The password is sent only to Better Auth's
 * server-side verifier and is never stored or logged by this feature.
 */
export async function verifyGovernancePassword(
  userId: string,
  password: string,
): Promise<"valid" | "invalid" | "rate-limited"> {
  // Better Auth's API is invoked inside the server process, so its HTTP
  // endpoint limiter is not necessarily the boundary for this call. This
  // actor-keyed process throttle is supplemental; Better Auth remains the
  // credential verifier and production deployments should also rate-limit
  // sensitive mutations at their shared edge or datastore boundary.
  const limit = rateLimit({
    key: `fellowship-governance-password:${userId}`,
    limit: GOVERNANCE_PASSWORD_LIMIT,
    windowMs: GOVERNANCE_PASSWORD_WINDOW_MS,
  });
  if (!limit.success) return "rate-limited";

  try {
    await auth.api.verifyPassword({
      body: { password },
      headers: await headers(),
    });
    return "valid";
  } catch (error) {
    if (error instanceof APIError) return "invalid";
    throw error;
  }
}
