"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import { getRequestIp } from "@/lib/request-ip";
import { logger } from "@/lib/logger";
import type { ActionResult } from "@/types/api";
import { platformSettingsRepository } from "@/features/platform-settings/repositories/platform-settings.repository";
import { updateActiveBrandThemeSchema } from "@/features/brand-themes/schemas/update-active-brand-theme.schema";
import { BRAND_THEME_PREVIEW_COOKIE } from "@/features/brand-themes/constants/brand-themes";

/** Validates and audits a global brand change; only a Super Admin may apply it. */
export async function updateActiveBrandThemeAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateActiveBrandThemeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Choose a registered brand theme.",
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
    await platformSettingsRepository.updateActiveBrandTheme({
      actorId: session.user.id,
      ipAddress: getRequestIp(requestHeaders),
      themeId: parsed.data.themeId,
    });

    const cookieStore = await cookies();
    cookieStore.delete(BRAND_THEME_PREVIEW_COOKIE);
    revalidatePath("/", "layout");
    return { success: true, message: "The brand theme is now active for everyone." };
  } catch (error) {
    logger.error("Unable to update the active brand theme.", {
      error,
      actorId: session.user.id,
    });
    return {
      success: false,
      message: "The brand theme could not be applied. Please try again.",
      errorCode: "ADM-001",
    };
  }
}
