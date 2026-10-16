import "server-only";
import { getLocale } from "next-intl/server";
import { requireServerSession } from "@/lib/auth/session";
import { getCachedUserSettings } from "./get-cached-user-settings";
import { isSupportedLocale } from "@/i18n/config";

/** Only timezone setup still needs account data; presentation stays device-owned. */
export async function getCurrentPreferences(): Promise<{
  locale: "en" | "es" | "fr";
  hasConfiguredTimeZone: boolean;
}> {
  const session = await requireServerSession();
  const [settings, locale] = await Promise.all([
    getCachedUserSettings(session.user.id), getLocale(),
  ]);
  return {
    locale: isSupportedLocale(locale) ? locale : "en",
    hasConfiguredTimeZone: settings?.hasConfiguredTimeZone ?? false,
  };
}
