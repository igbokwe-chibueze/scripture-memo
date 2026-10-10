"use server";

import { cookies } from "next/headers";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { getServerSession } from "@/lib/auth/session";
import { isSuperAdmin } from "@/lib/permissions";
import type { ActionResult } from "@/types/api";
import {
  BRAND_THEME_PREVIEW_COOKIE,
  BRAND_THEME_PREVIEW_MAX_AGE_SECONDS,
} from "@/features/brand-themes/constants/brand-themes";
import { updateActiveBrandThemeSchema } from "@/features/brand-themes/schemas/update-active-brand-theme.schema";

/** Saves a one-hour, browser-local preview after validating the theme and role. */
export async function startBrandThemePreviewAction(
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

  const cookieStore = await cookies();
  cookieStore.set(BRAND_THEME_PREVIEW_COOKIE, parsed.data.themeId, {
    httpOnly: true,
    maxAge: BRAND_THEME_PREVIEW_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return {
    success: true,
    message: "Preview enabled in your browser for one hour.",
  };
}

/** Clears the current Super Admin browser's temporary theme preview. */
export async function clearBrandThemePreviewAction(): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }
  if (!isSuperAdmin(session.user.role as UserRole | undefined)) {
    return { success: false, message: "Super Admin access is required." };
  }

  const cookieStore = await cookies();
  cookieStore.delete(BRAND_THEME_PREVIEW_COOKIE);

  return { success: true, message: "Theme preview cleared." };
}
