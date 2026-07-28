"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { isBadgeCriterionAvailable } from "@/features/badges/constants/badge-criteria";
import { createBadgeSlug } from "@/features/badges/lib/badge-slug";
import { badgeRepository } from "@/features/badges/repositories/badge.repository";
import { saveBadgeSchema } from "@/features/badges/schemas/save-badge.schema";

/** Creates or edits an audited badge using only controlled engine criteria. */
export async function saveBadgeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = saveBadgeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Review the badge details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const session = await getServerSession();
  if (!session?.user) return { success: false, message: "Authentication required." };
  if (!isAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Administrator access is required." };
  }
  if (
    parsed.data.isActive &&
    !isBadgeCriterionAvailable(parsed.data.criteriaKey)
  ) {
    return {
      success: false,
      message:
        "This criterion belongs to a future feature. Save the badge as paused until its trusted event is implemented.",
    };
  }

  const slug = createBadgeSlug(parsed.data.name);
  if (!slug) {
    return {
      success: false,
      message: "The badge name must contain letters or numbers.",
      fieldErrors: { name: ["Enter a name containing letters or numbers."] },
    };
  }

  try {
    const requestHeaders = await headers();
    const id = await badgeRepository.saveDefinition(
      {
        ...parsed.data,
        slug,
        icon: parsed.data.icon || null,
      },
      session.user.id,
      getRequestIp(requestHeaders),
    );
    revalidatePath("/admin/badges");
    revalidatePath("/vault/badges");
    return {
      success: true,
      message: parsed.data.id ? "Badge updated." : "Badge created.",
      data: { id },
    };
  } catch (error) {
    logger.error("Unable to save badge definition.", {
      error,
      actorId: session.user.id,
      badgeId: parsed.data.id,
    });
    return {
      success: false,
      message:
        "The badge could not be saved. Its name may already be in use.",
    };
  }
}
