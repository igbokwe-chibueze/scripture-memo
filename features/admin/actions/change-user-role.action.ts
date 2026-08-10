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
import { changeUserRoleSchema } from "@/features/admin/schemas/manage-user.schema";

/** Changes one account role through an audited Super Admin-only boundary. */
export async function changeUserRoleAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = changeUserRoleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Select a valid account role.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
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
      message: "Use another Super Admin account to change your own role.",
    };
  }

  try {
    const requestHeaders = await headers();
    const status = await adminRepository.changeUserRole({
      actorId: session.user.id,
      targetUserId: parsed.data.userId,
      role: parsed.data.role,
      ipAddress: getRequestIp(requestHeaders),
    });
    if (status === "missing") {
      return { success: false, message: "The selected account no longer exists." };
    }
    if (status === "last-super-admin") {
      return {
        success: false,
        message: "The final Super Admin cannot be demoted.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return { success: true, message: "Account role updated and audited." };
  } catch (error) {
    logger.error("Unable to change an account role.", {
      error,
      actorId: session.user.id,
      targetUserId: parsed.data.userId,
    });
    return { success: false, message: "The account role could not be updated." };
  }
}
