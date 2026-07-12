"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";
import type { ActionResult } from "@/types/api";
import { settingsRepository } from "@/features/settings/repositories/settings.repository";
import { updateUserSettingsSchema } from "@/features/settings/schemas/update-user-settings.schema";

/** Validates and saves preferences for the server-authenticated user only. */
export async function updateUserSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateUserSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted settings.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }

  try {
    // WHY: Identity comes exclusively from the trusted session. Accepting a
    // userId in form data would let a valid user modify another account.
    await settingsRepository.updateForUser(session.user.id, parsed.data);
    revalidatePath("/settings");
    revalidatePath("/game");
    return { success: true, message: "Settings saved." };
  } catch {
    return {
      success: false,
      message: "Unable to save settings. Please try again.",
    };
  }
}
