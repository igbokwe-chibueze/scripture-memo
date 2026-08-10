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
import { setUserSuspensionSchema } from "@/features/admin/schemas/manage-user.schema";

/** Suspends or restores one account and records the privileged operation. */
export async function setUserSuspensionAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = setUserSuspensionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Review the suspension details.",
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
      message: "You cannot suspend your current account.",
    };
  }

  try {
    const requestHeaders = await headers();
    const status = await adminRepository.setUserSuspension({
      actorId: session.user.id,
      targetUserId: parsed.data.userId,
      suspended: parsed.data.suspended,
      reason: parsed.data.suspended ? parsed.data.reason ?? null : null,
      ipAddress: getRequestIp(requestHeaders),
    });
    if (status === "missing") {
      return { success: false, message: "The selected account no longer exists." };
    }
    if (status === "last-super-admin") {
      return {
        success: false,
        message: "The final active Super Admin cannot be suspended.",
      };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return {
      success: true,
      message: parsed.data.suspended
        ? "Account suspended and active sessions revoked."
        : "Account access restored.",
    };
  } catch (error) {
    logger.error("Unable to change account suspension.", {
      error,
      actorId: session.user.id,
      targetUserId: parsed.data.userId,
    });
    return {
      success: false,
      message: "The account access state could not be updated.",
    };
  }
}
