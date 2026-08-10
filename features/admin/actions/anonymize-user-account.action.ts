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
import { anonymizeUserAccountSchema } from "@/features/admin/schemas/manage-user.schema";

/** Permanently anonymizes another account while preserving historical records. */
export async function anonymizeUserAccountAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = anonymizeUserAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Type DELETE to confirm permanent account removal.",
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
      message: "You cannot delete your current account.",
    };
  }

  try {
    const requestHeaders = await headers();
    const status = await adminRepository.anonymizeUserAccount({
      actorId: session.user.id,
      targetUserId: parsed.data.userId,
      ipAddress: getRequestIp(requestHeaders),
    });
    if (status === "missing") {
      return { success: false, message: "The selected account no longer exists." };
    }
    if (status === "last-super-admin") {
      return {
        success: false,
        message: "The final active Super Admin cannot be deleted.",
      };
    }
    if (status === "already-anonymized") {
      return { success: false, message: "This account was already deleted." };
    }

    revalidatePath("/admin");
    revalidatePath("/admin/users");
    return {
      success: true,
      message: "Account deleted and identifying data anonymized.",
    };
  } catch (error) {
    logger.error("Unable to anonymize an account.", {
      error,
      actorId: session.user.id,
      targetUserId: parsed.data.userId,
    });
    return { success: false, message: "The account could not be deleted." };
  }
}
