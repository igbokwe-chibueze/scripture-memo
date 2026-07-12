import "server-only";

import { requireServerSession } from "@/lib/auth/session";
import { settingsRepository } from "@/features/settings/repositories/settings.repository";

/** Loads trusted visual and audio preferences for the protected application shell. */
export async function getCurrentPreferences(): Promise<{
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;
  audioEnabled: boolean;
}> {
  const session = await requireServerSession();
  const settings = await settingsRepository.getByUserId(session.user.id);

  return {
    theme: settings?.theme ?? "system",
    reducedMotion: settings?.reducedMotion ?? false,
    audioEnabled: settings?.audioEnabled ?? true,
  };
}
