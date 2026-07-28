"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { getRequestIp } from "@/lib/request-ip";
import type { ActionResult } from "@/types/api";
import { setBadgeActiveSchema } from "@/features/badges/schemas/award-badge.schema";
import { badgeRepository } from "@/features/badges/repositories/badge.repository";
import { isBadgeCriterionAvailable } from "@/features/badges/constants/badge-criteria";

/** Allows administrators to pause or resume one badge definition. */
export async function setBadgeActiveAction(input: unknown): Promise<ActionResult> {
  const parsed = setBadgeActiveSchema.safeParse(input);
  if (!parsed.success) return { success: false, message: "Invalid badge selection." };
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }
  try {
    if (parsed.data.isActive) {
      const criteriaKey = await badgeRepository.findCriterionById(
        parsed.data.badgeId,
      );
      if (!criteriaKey) {
        return { success: false, message: "Badge not found." };
      }
      if (!isBadgeCriterionAvailable(criteriaKey)) {
        return {
          success: false,
          message:
            "This badge depends on a future feature and cannot be activated yet.",
        };
      }
    }
    const requestHeaders = await headers();
    await badgeRepository.setActive(
      parsed.data.badgeId,
      parsed.data.isActive,
      session.user.id,
      getRequestIp(requestHeaders),
    );
    revalidatePath("/admin/badges");
    revalidatePath("/vault/badges");
    return {
      success: true,
      message: parsed.data.isActive ? "Badge activated." : "Badge paused.",
    };
  } catch (error) {
    logger.error("Unable to update badge availability.", {
      error,
      badgeId: parsed.data.badgeId,
      actorId: session.user.id,
    });
    return { success: false, message: "Badge availability could not be updated." };
  }
}
