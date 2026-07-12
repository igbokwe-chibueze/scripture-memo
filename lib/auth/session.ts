import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

/** Returns the authoritative Better Auth session for the current server request. */
export async function getServerSession(): Promise<
  typeof auth.$Infer.Session | null
> {
  return auth.api.getSession({ headers: await headers() });
}

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
