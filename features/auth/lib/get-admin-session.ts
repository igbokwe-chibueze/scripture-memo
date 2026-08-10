import "server-only";

import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { isAdmin, isSuperAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";

/** Requires an authoritative ADMIN or SUPER_ADMIN session for protected reads. */
export async function getAdminSession(): Promise<
  NonNullable<Awaited<ReturnType<typeof getServerSession>>>
> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user.role as UserRole | undefined)) redirect("/game");
  return session;
}

/** Requires the highest trusted role before protected Super Admin reads. */
export async function getSuperAdminSession(): Promise<
  NonNullable<Awaited<ReturnType<typeof getServerSession>>>
> {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    redirect("/admin");
  }
  return session;
}
