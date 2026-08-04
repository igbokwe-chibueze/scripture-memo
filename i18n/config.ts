/** Locales currently shipped with the player experience. */
export const SUPPORTED_LOCALES = ["en", "es", "fr"] as const;

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
    .map((entry, index) => {
      const [languagePart, ...parameters] = entry.trim().toLowerCase().split(";");
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
      const quality = qualityParameter ? Number.parseFloat(qualityParameter.split("=")[1] ?? "0") : 1;
      return { language: languagePart ?? "", quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter(({ language, quality }) => Boolean(language) && quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  for (const { language } of requestedLanguages) {
    const baseLanguage = language.split("-")[0];
    if (isSupportedLocale(baseLanguage)) return baseLanguage;
  }
  return DEFAULT_LOCALE;
}
