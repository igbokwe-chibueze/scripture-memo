"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { platformSettingsRepository } from "@/features/platform-settings/repositories/platform-settings.repository";
import { updatePlatformSettingsSchema } from "@/features/platform-settings/schemas/update-platform-settings.schema";

/** Validates and saves Super Admin defaults with transactionally paired audit evidence. */
export async function updatePlatformSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updatePlatformSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the platform settings and try again.",
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

  try {
    const requestHeaders = await headers();
    await platformSettingsRepository.update({
      actorId: session.user.id,
      ipAddress: getRequestIp(requestHeaders),
      input: parsed.data,
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    revalidatePath("/game", "layout");
    return { success: true, message: "Platform settings saved and audited." };
  } catch (error) {
    logger.error("Unable to update platform settings.", {
      error,
      actorId: session.user.id,
    });
    return {
      success: false,
      message: "Platform settings could not be saved. Please try again.",
      errorCode: "ADM-001",
    };
  }
}
