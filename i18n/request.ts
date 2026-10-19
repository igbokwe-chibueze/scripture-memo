import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
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
 * The device cookie wins; Accept-Language supplies first-visit defaults.
 * Language resolution never reads the session or database.
 */
export default getRequestConfig(async () => {
  const requestHeaders = await headers();
  const requestCookies = await cookies();
  const cookieLocale = requestCookies.get(LOCALE_COOKIE_NAME)?.value;
  let locale: AppLocale | null = isSupportedLocale(cookieLocale)
    ? cookieLocale
    : null;

  if (!locale) locale = localeFromAcceptLanguage(requestHeaders.get("accept-language"));
  if (!isSupportedLocale(locale)) locale = DEFAULT_LOCALE;

  return {
    locale,
    messages: await messageLoaders[locale](),
  };
});
