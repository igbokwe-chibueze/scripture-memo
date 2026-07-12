import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { PROTECTED_PATH_PREFIXES } from "@/features/auth/constants/protected-paths";

/**
 * Performs optimistic navigation redirects using a validated Better Auth session.
 * Protected views and Server Actions must still enforce their own authorization;
 * Proxy is not the application's final security boundary.
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATH_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtected) return NextResponse.next();

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!isAdmin(session.user.role as UserRole | undefined)) {
      return NextResponse.redirect(new URL("/game", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/game/:path*", "/map/:path*", "/waypoints/:path*", "/vault/:path*",
    "/sanctuary/:path*", "/oil-shop/:path*", "/fellowships/:path*",
    "/leaderboard/:path*", "/settings/:path*", "/select-translation/:path*",
    "/admin/:path*",
  ],
};
