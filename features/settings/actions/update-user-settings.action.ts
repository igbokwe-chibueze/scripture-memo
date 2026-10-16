"use server";

import { getSessionFromHeaders } from "@/lib/auth/get-session-from-headers";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { ActionResult } from "@/types/api";
import { settingsRepository } from "@/features/settings/repositories/settings.repository";
import { accountSettingsSchema } from "@/features/settings/schemas/update-user-settings.schema";

/** Validates and saves preferences for the server-authenticated user only. */
export async function updateUserSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = accountSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const t = await getTranslations("Settings");

    return {
      success: false,
      message: t("checkHighlighted"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const t = await getTranslations("Settings");
  const session = await getSessionFromHeaders(await headers() );
  if (!session?.user) {
    return { success: false, message: t("authRequired") };
  }

  try {
    // WHY: Identity comes exclusively from the trusted session. Accepting a
    // userId in form data would let a valid user modify another account.
    await settingsRepository.updateForUser(session.user.id, parsed.data);
    revalidatePath("/", "layout");
    return { success: true, message: t("saved") };
  } catch {
    return {
      success: false,
      message: t("saveError"),
    };
  }
}
