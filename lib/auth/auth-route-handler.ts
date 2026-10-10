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
    if (requestUrl.pathname.endsWith("/get-session")) {
      // WHY: Browser session reads must see a session revoked by suspension
      // immediately, not rely on Better Auth's short-lived cookie cache.
      requestUrl.searchParams.set("disableCookieCache", "true");
      const response = await betterAuthHandlers.GET(
        new Request(requestUrl, request),
      );
      return rejectBannedSessionResponse(response);
    }

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

/**
 * Passes Better Auth mutations to its installed Next.js adapter.
 *
 * A banned account's central session hook correctly rejects sign-in, but its
 * internal `BANNED_USER` code and 403 status would distinguish that account
 * from an unknown email or incorrect password. Normalize that one public
 * response to Better Auth's ordinary credential failure so the direct auth
 * endpoint preserves the app's account-enumeration protections.
 */
export async function POST(request: Request): Promise<Response> {
  const response = await betterAuthHandlers.POST(request);
  const requestUrl = new URL(request.url);

  if (
    !requestUrl.pathname.endsWith("/sign-in/email") ||
    response.status !== 403
  ) {
    return response;
  }

  const responseBody: unknown = await response.clone().json().catch(() => null);
  if (
    !responseBody ||
    typeof responseBody !== "object" ||
    !("code" in responseBody) ||
    responseBody.code !== "BANNED_USER"
  ) {
    return response;
  }

  return Response.json(
    {
      message: "Invalid email or password",
      code: "INVALID_EMAIL_OR_PASSWORD",
    },
    { status: 401 },
  );
}

/**
 * Hides a banned session returned by Better Auth's browser-facing session API.
 *
 * The normal admin flow deletes persisted sessions. This check handles a
 * concurrent sign-in that created a session immediately before suspension
 * committed. It only performs cleanup after the response proves the returned
 * session belongs to a banned user, and deletion is scoped to that user.
 */
async function rejectBannedSessionResponse(
  response: Response,
): Promise<Response> {
  if (!response.ok) return response;

  const responseBody: unknown = await response.clone().json().catch(() => null);
  if (
    !responseBody ||
    typeof responseBody !== "object" ||
    !("user" in responseBody) ||
    !responseBody.user ||
    typeof responseBody.user !== "object" ||
    !("banned" in responseBody.user) ||
    responseBody.user.banned !== true ||
    !("id" in responseBody.user) ||
    typeof responseBody.user.id !== "string"
  ) {
    return response;
  }

  await authRepository.revokeSessionsForBannedUser(responseBody.user.id);

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response("null", {
    status: response.status,
    headers,
  });
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
