"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { adminRepository } from "@/features/admin/repositories/admin.repository";
import { revokeUserSessionsSchema } from "@/features/admin/schemas/manage-user.schema";

/** Revokes another user's active sessions through an audited Super Admin gate. */
export async function revokeUserSessionsAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = revokeUserSessionsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Select a valid account." };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Super Admin access is required." };
  }
  if (session.user.id === parsed.data.userId) {
    return {
      success: false,
      message: "You cannot revoke the session you are currently using.",
    };
  }

  try {
    const requestHeaders = await headers();
    const status = await adminRepository.revokeUserSessions({
      actorId: session.user.id,
      targetUserId: parsed.data.userId,
      ipAddress: getRequestIp(requestHeaders),
    });
    if (status === "missing") {
      return { success: false, message: "The selected account no longer exists." };
    }

    revalidatePath("/admin/users");
    return { success: true, message: "All active sessions were revoked." };
  } catch (error) {
    logger.error("Unable to revoke account sessions.", {
      error,
      actorId: session.user.id,
      targetUserId: parsed.data.userId,
    });
    return { success: false, message: "Active sessions could not be revoked." };
  }
}
