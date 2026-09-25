import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { isAdmin, isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { PROTECTED_PATH_PREFIXES } from "@/features/auth/constants/protected-paths";

/**
 * Adds a nonce-based CSP in report-only mode to document responses.
 *
 * Next.js reads the request-side `Content-Security-Policy` value while it
 * renders so it can nonce its framework scripts and styles. The browser only
 * receives `Content-Security-Policy-Report-Only` for now, which reports policy
 * conflicts without blocking the UI while representative routes are reviewed.
 */
function continueWithCspReportOnly(request: NextRequest): NextResponse {
  // WHY: A fresh, unpredictable value is required for every rendered document;
  // reusing one across requests would let injected markup reuse trusted scripts.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";
  const cspHeader = [
    "default-src 'self'",
    // Keep first-party lazy chunks loadable. `strict-dynamic` would make
    // browsers ignore `'self'` when Next inserts same-origin route chunks that
    // do not carry a nonce, as seen with the app loading boundary in production.
    `script-src 'self' 'nonce-${nonce}'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    [
      "style-src 'self'",
      isDevelopment ? "'unsafe-inline'" : `'nonce-${nonce}'`,
      // Sonner 2.0.7 injects its fixed stylesheet as a style element without
      // exposing a nonce prop. These exact hashes came from the production
      // report-only review; they permit only those two observed style blocks.
      ...(isDevelopment
        ? []
        : [
            "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='",
            "'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='",
          ]),
    ].join(" "),
    // Current gameplay and map surfaces use computed React style attributes
    // for coordinates and progress widths. This exception permits those style
    // values only; script execution still requires the per-response nonce.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  // WHY: These request headers are consumed by the Next.js renderer and the
  // root layout. They are forwarded upstream but are not exposed as enforcing
  // response headers during this observation phase.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("Content-Security-Policy-Report-Only");
  requestHeaders.set("Content-Security-Policy", cspHeader);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy-Report-Only", cspHeader);

  return response;
}

/**
 * Continues a request and attaches a report-only CSP only to full document
 * responses; RSC transitions, Server Actions, and resource requests do not need
 * a document nonce and should not pay the per-document policy overhead.
 */
function continueRequest(request: NextRequest): NextResponse {
  const acceptHeader = request.headers.get("accept") ?? "";

  if (acceptHeader.includes("text/html")) {
    return continueWithCspReportOnly(request);
  }

  return NextResponse.next();
}

/**
 * Performs optimistic navigation redirects using a validated Better Auth session.
 * Protected views and Server Actions must still enforce their own authorization;
 * Proxy is not the application's final security boundary.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // The PNG positioner is source-authoring tooling, not a product route. Block
  // it before React streaming starts so production returns a genuine 404 rather
  // than a successful response containing a streamed not-found UI. The view
  // repeats the environment guard as defense in depth if Proxy configuration is
  // ever changed. This check performs no authentication or database access.
  if (pathname === "/map-positioner" && process.env.NODE_ENV !== "development") {
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const isProtected = PROTECTED_PATH_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtected) return continueRequest(request);

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the query as part of the internal return path. Invitation and
    // other resumable flows may carry a validated opaque token in that query.
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const role = session.user.role as UserRole | undefined;
    if (!isAdmin(role)) {
      return NextResponse.redirect(new URL("/game", request.url));
    }

    // WHY: Proxy gives regular Admins immediate navigation feedback, while the
    // view and every mutation repeat this check as the trusted authorization
    // boundary. Direct Server Action requests cannot rely on Proxy alone.
    if (
      (pathname === "/admin/users" || pathname.startsWith("/admin/users/")) &&
      !isSuperAdmin(role)
    ) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return continueRequest(request);
}

export const config = {
  matcher: [
    "/game/:path*", "/map/:path*", "/waypoints/:path*", "/vault/:path*",
    "/sanctuary/:path*", "/oil-shop/:path*", "/fellowships/:path*",
    "/leaderboard/:path*", "/settings/:path*", "/select-translation/:path*",
    "/admin/:path*", "/map-positioner",
    {
      // Apply CSP to public and protected document navigations. Next static
      // assets, image optimization, APIs, and prefetches do not render HTML and
      // should not pay for a nonce or receive a document policy.
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      has: [
        {
          type: "header",
          key: "accept",
          value: "text/html.*",
        },
      ],
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
