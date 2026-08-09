import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { getServerSession } from "@/lib/auth/session";
import { getCachedUserSettings } from "@/features/settings/lib/get-cached-user-settings";
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
  // WHY: The locale cookie is updated whenever a learner saves settings and is
  // sufficient to render translated UI. Consulting it first turns nearly every
  // request into a zero-database locale lookup while the account row remains the
  // durable cross-device fallback for a browser that has no cookie yet.
  let locale: AppLocale | null = isSupportedLocale(cookieLocale)
    ? cookieLocale
    : null;

  if (!locale) {
    try {
      const session = await getServerSession();
      if (session?.user) {
        const settings = await getCachedUserSettings(session.user.id);
        if (isSupportedLocale(settings?.locale)) locale = settings.locale;
      }
    } catch {
      // Authentication or database availability must not prevent public error,
      // login, or recovery pages from choosing a deterministic language.
    }
  }

  if (!locale) locale = localeFromAcceptLanguage(requestHeaders.get("accept-language"));
  if (!isSupportedLocale(locale)) locale = DEFAULT_LOCALE;

  return {
    locale,
    messages: await messageLoaders[locale](),
  };
});
