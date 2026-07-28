"use server";

import { getServerSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/api";
import { settingsRepository } from "@/features/settings/repositories/settings.repository";
import { detectTimeZoneSchema } from "@/features/settings/schemas/detect-time-zone.schema";

/**
 * Persists the authenticated learner's browser timezone once.
 *
 * The repository refuses to overwrite an already configured value, so a later
 * device or browser cannot replace an automatic or manual learner choice.
 */
export async function detectTimeZoneAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = detectTimeZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "The detected timezone is not supported." };
  }
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, message: "Authentication required." };
  }

  try {
    await settingsRepository.configureDetectedTimeZone(
      session.user.id,
      parsed.data.timeZone,
    );
    return { success: true, message: "Timezone detected." };
  } catch {
    return { success: false, message: "Timezone could not be detected." };
  }
}
