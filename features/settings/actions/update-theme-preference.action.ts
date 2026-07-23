"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";
import { settingsRepository } from "@/features/settings/repositories/settings.repository";
import { updateThemePreferenceSchema } from "@/features/settings/schemas/update-theme-preference.schema";

/**
 * Persists a shared theme-switcher choice when the visitor is authenticated.
 *
 * Anonymous visitors still receive a successful local-only result because the
 * public landing-page switcher is valid without an account. Identity always
 * comes from the server session; the browser never submits a user ID.
 */
export async function updateThemePreferenceAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateThemePreferenceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Select a valid appearance.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await getServerSession();
  if (!session?.user) {
    return { success: true, message: "Browser appearance updated." };
  }

  try {
    await settingsRepository.updateThemeForUser(
      session.user.id,
      parsed.data.theme,
    );
    revalidatePath("/game");
    revalidatePath("/settings");
    return { success: true, message: "Appearance saved." };
  } catch {
    return {
      success: false,
      message: "Appearance changed on this device but could not be saved.",
    };
  }
}
