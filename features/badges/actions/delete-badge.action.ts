"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { deleteBadgeSchema } from "@/features/badges/schemas/award-badge.schema";
import { badgeRepository } from "@/features/badges/repositories/badge.repository";

/** Deletes an unearned badge while preserving every permanent earned award. */
export async function deleteBadgeAction(input: unknown): Promise<ActionResult> {
  const parsed = deleteBadgeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid badge selection." };
  }
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }

  try {
    const requestHeaders = await headers();
    const result = await badgeRepository.deleteUnearned(
      parsed.data.badgeId,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    if (result.status === "missing") {
      return { success: false, message: "Badge not found." };
    }
    if (result.status === "earned") {
      return {
        success: false,
        message:
          "This badge has already been earned and is permanent. Pause it instead.",
      };
    }
    revalidatePath("/admin/badges");
    revalidatePath("/vault/badges");
    return {
      success: true,
      message:
        result.removedProgressCount > 0
          ? `Badge deleted with ${result.removedProgressCount} partial progress record${result.removedProgressCount === 1 ? "" : "s"}.`
          : "Badge deleted.",
    };
  } catch (error) {
    logger.error("Unable to delete badge definition.", {
      error,
      actorId: session.user.id,
      badgeId: parsed.data.badgeId,
    });
    return { success: false, message: "The badge could not be deleted." };
  }
}
