import "server-only";

import { authRepository } from "@/features/auth/repositories/auth.repository";
import { auth } from "@/lib/auth/auth";

/**
 * Resolves a Better Auth session from request headers and forces the persisted
 * session record to be checked instead of trusting a cached session cookie.
 *
 * WHY: Admin suspension revokes persisted sessions in the same transaction
 * that records the suspension. Disabling Better Auth's cookie cache makes that
 * revocation effective on the next protected request, including direct Server
 * Action and Proxy requests.
 *
 * @param requestHeaders Headers belonging to the request being authorized.
 * @returns The current session only when Better Auth still has a valid database
 * session; otherwise returns null.
 */
export async function getSessionFromHeaders(
  requestHeaders: Headers,
): Promise<typeof auth.$Infer.Session | null> {
  const session = await auth.api.getSession({
    headers: requestHeaders,
    query: { disableCookieCache: true },
  });

  if (session?.user.banned) {
    // WHY: The Admin plugin prevents ordinary banned-account sign-ins. This
    // validation guard also rejects sessions that raced with the suspension
    // transaction, and removes them so restoring the account cannot reactivate
    // a session that existed before suspension.
    await authRepository.revokeSessionsForBannedUser(session.user.id);
    return null;
  }

  return session;
}
