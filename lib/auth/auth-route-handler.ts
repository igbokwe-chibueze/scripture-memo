import { toNextJsHandler } from "better-auth/next-js";
import { authRepository } from "@/features/auth/repositories/auth.repository";
import { getSafePostLoginPath } from "@/features/auth/lib/get-safe-post-login-path";
import { getVerificationTokenEmail } from "@/features/auth/lib/email-verification-token";
import { auth } from "@/lib/auth/auth";

const betterAuthHandlers = toNextJsHandler(auth);

/**
 * Routes Better Auth requests and rejects stale email links before invoking
 * Better Auth's built-in verifier. The early check matters because Better Auth
 * otherwise treats every unexpired signed link for an already-verified email
 * as successful, even when a newer link replaced it. Better Auth remains the
 * authority for signature verification, expiry, and changing emailVerified.
 */
export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);

  if (!requestUrl.pathname.endsWith("/verify-email")) {
    return betterAuthHandlers.GET(request);
  }

  const token = requestUrl.searchParams.get("token");
  const email = token ? getVerificationTokenEmail(token) : null;
  const isLatestToken =
    token && email
      ? await authRepository.isLatestEmailVerificationToken(
          email,
          token,
          new Date(),
        )
      : false;

  if (!isLatestToken) {
    return createInactiveLinkRedirect(requestUrl);
  }

  return betterAuthHandlers.GET(request);
}

/** Passes every Better Auth POST request to its installed Next.js adapter. */
export function POST(request: Request): Promise<Response> {
  return betterAuthHandlers.POST(request);
}

/**
 * Sends replaced, consumed, malformed, and expired links back to login with a
 * safe message. Only an internal `next` destination from Better Auth's
 * callbackURL is retained; untrusted external redirect targets are discarded.
 */
function createInactiveLinkRedirect(requestUrl: URL): Response {
  const loginUrl = new URL("/login", requestUrl.origin);
  loginUrl.searchParams.set("verificationError", "inactive");
  const callbackValue = requestUrl.searchParams.get("callbackURL");

  if (callbackValue) {
    try {
      const callbackUrl = new URL(callbackValue, requestUrl.origin);
      const nextPath = callbackUrl.searchParams.get("next");

      if (callbackUrl.origin === requestUrl.origin && nextPath) {
        loginUrl.searchParams.set("next", getSafePostLoginPath(nextPath));
      }
    } catch {
      // Invalid callbacks never override the fixed same-origin login destination.
    }
  }

  return Response.redirect(loginUrl, 303);
}
