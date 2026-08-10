import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { isAdmin, isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { PROTECTED_PATH_PREFIXES } from "@/features/auth/constants/protected-paths";

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

  if (!isProtected) return NextResponse.next();

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/game/:path*", "/map/:path*", "/waypoints/:path*", "/vault/:path*",
    "/sanctuary/:path*", "/oil-shop/:path*", "/fellowships/:path*",
    "/leaderboard/:path*", "/settings/:path*", "/select-translation/:path*",
    "/admin/:path*", "/map-positioner",
  ],
};
