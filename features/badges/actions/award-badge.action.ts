"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import { awardBadgeSchema } from "@/features/badges/schemas/award-badge.schema";
import { badgeRepository } from "@/features/badges/repositories/badge.repository";

/** Performs a fully audited SUPER_ADMIN-only permanent badge grant. */
export async function awardBadgeAction(
  input: unknown,
): Promise<ActionResult<BadgeUnlockResult>> {
  const parsed = awardBadgeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Select a valid badge and user email.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Super Admin access is required." };
  }

  try {
    const requestHeaders = await headers();
    const result = await badgeRepository.awardManually(
      parsed.data.badgeId,
      parsed.data.userEmail,
      session.user.id,
      getRequestIp(requestHeaders),
      new Date(),
    );
    if (!result) {
      return { success: false, message: "The badge or user account was not found." };
    }
    revalidatePath("/admin/badges");
    return {
      success: true,
      message:
        result.rewardAmount > 0
          ? `${result.name} awarded with ${result.rewardAmount} Glow Points.`
          : `${result.name} was already unlocked for this player.`,
      data: result,
    };
  } catch (error) {
    logger.error("Unable to grant badge manually.", {
      error,
      actorId: session.user.id,
      badgeId: parsed.data.badgeId,
    });
    return { success: false, message: "The badge could not be awarded." };
  }
}
