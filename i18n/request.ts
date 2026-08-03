import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { auth } from "@/lib/auth/auth";
import { settingsRepository } from "@/features/settings/repositories/settings.repository";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  isSupportedLocale,
  localeFromAcceptLanguage,
  type AppLocale,
} from "@/i18n/config";

const messageLoaders: Record<AppLocale, () => Promise<Record<string, unknown>>> = {
  en: async () => (await import("@/messages/en.json")).default,
  es: async () => (await import("@/messages/es.json")).default,
  fr: async () => (await import("@/messages/fr")).default,
};

/**
 * Resolves the locale without adding language segments to private game URLs.
 *
 * WHY: A signed-in account preference must win across devices. The cookie gives
 * logged-out pages and subsequent requests an immediate stable language, while
 * Accept-Language provides a useful first-visit default. Bible translation is
 * intentionally unrelated to this interface-only locale decision.
 */
export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const requestCookies = await cookies();
  const cookieLocale = requestCookies.get(LOCALE_COOKIE_NAME)?.value;
  let locale: AppLocale | null = null;

  try {
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (session?.user) {
      const settings = await settingsRepository.getByUserId(session.user.id);
      if (isSupportedLocale(settings?.locale)) locale = settings.locale;
    }
  } catch {
    // Authentication or database availability must not prevent public error,
    // login, or recovery pages from rendering in a deterministic language.
  }

  if (!locale && isSupportedLocale(cookieLocale)) locale = cookieLocale;
  if (!locale) locale = localeFromAcceptLanguage(requestHeaders.get("accept-language"));
  if (!isSupportedLocale(locale)) locale = DEFAULT_LOCALE;

  return {
    locale,
    messages: await messageLoaders[locale](),
  };
});
