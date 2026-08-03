/** Locales currently shipped with the player experience. */
export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE_NAME = "scripture-memo-locale";

/** Narrows untrusted database, cookie, and browser values to shipped locales. */
export function isSupportedLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as AppLocale);
}

/** Selects a supported language from the browser's weighted language header. */
export function localeFromAcceptLanguage(value: string | null): AppLocale {
  if (!value) return DEFAULT_LOCALE;

  const requestedLanguages = value
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim().toLowerCase())
    .filter((entry): entry is string => Boolean(entry));

  return requestedLanguages.some((language) => language === "es" || language.startsWith("es-"))
    ? "es"
    : DEFAULT_LOCALE;
}
