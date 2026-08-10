import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

/** Returns the authoritative Better Auth session for the current server request. */
export const getServerSession = cache(async (): Promise<
  typeof auth.$Infer.Session | null
> => {
  // WHY: A protected render can ask for identity from its layout, view, and
  // feature data loader. React cache scopes this promise to the current render
  // pass so those callers share one Better Auth lookup instead of multiplying
  // database work. It is deliberately not a cross-request user cache.
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Requires a valid server-side session and redirects anonymous navigation.
 * Proxy improves navigation UX, but this check is the trusted page boundary.
 */
export async function requireServerSession(): Promise<
  NonNullable<typeof auth.$Infer.Session>
> {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
