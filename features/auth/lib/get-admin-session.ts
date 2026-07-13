import "server-only";

import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import type { UserRole } from "@/lib/generated/prisma/enums";

/** Requires an authoritative ADMIN or SUPER_ADMIN session for protected reads. */
export async function getAdminSession() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.user.role as UserRole | undefined)) redirect("/game");
  return session;
}
