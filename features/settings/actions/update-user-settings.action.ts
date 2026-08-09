"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/auth";
import type { ActionResult } from "@/types/api";
import { settingsRepository } from "@/features/settings/repositories/settings.repository";
import { updateUserSettingsSchema } from "@/features/settings/schemas/update-user-settings.schema";
import { LOCALE_COOKIE_NAME } from "@/i18n/config";

/** Validates and saves preferences for the server-authenticated user only. */
export async function updateUserSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  const t = await getTranslations("Settings");
  const parsed = updateUserSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: t("checkHighlighted"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, message: t("authRequired") };
  }

  try {
    // WHY: Identity comes exclusively from the trusted session. Accepting a
    // userId in form data would let a valid user modify another account.
    await settingsRepository.updateForUser(session.user.id, parsed.data);
    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE_NAME, parsed.data.locale, {
      // Locale is presentation state rather than a credential. Client-side
      // synchronization may safely maintain it to avoid per-request DB reads.
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidatePath("/", "layout");
    return { success: true, message: t("saved") };
  } catch {
    return {
      success: false,
      message: t("saveError"),
    };
  }
}
