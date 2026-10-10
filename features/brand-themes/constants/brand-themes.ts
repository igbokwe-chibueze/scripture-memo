/**
 * Central list of brand themes the application is allowed to activate.
 *
 * Adding a future theme means adding its validated light/dark CSS file and one
 * entry here. Components and user appearance preferences stay untouched.
 */
export const BRAND_THEMES = [
  {
    id: "tropical-teal",
    name: "Tropical Teal",
    description: "The original Scripture Memo palette.",
    stylesheet: "app/themes/tropical-teal.css",
  },
  {
    id: "arcade-bloom",
    name: "Arcade Bloom",
    description: "Playful purple with blue accents and bright rewards.",
    stylesheet: "app/themes/arcade-bloom.css",
  },
  {
    id: "ocean-mango",
    name: "Ocean & Mango",
    description: "Ocean blue paired with warm mango rewards.",
    stylesheet: "app/themes/ocean-mango.css",
  },
  {
    id: "lemon-grove",
    name: "Lemon Grove",
    description: "Bright lemon-lime primary with calm green surfaces.",
    stylesheet: "app/themes/lemon-grove.css",
  },
] as const;

/** Stable theme identifier type shared by persistence, UI, and validation. */
export type BrandThemeId = (typeof BRAND_THEMES)[number]["id"];

/** The theme used for first install, missing data, and invalid legacy values. */
export const DEFAULT_BRAND_THEME_ID: BrandThemeId = "tropical-teal";

/** Browser-local preview cookie, intentionally distinct from the global value. */
export const BRAND_THEME_PREVIEW_COOKIE = "scripture-memo-brand-theme-preview";

/** A forgotten preview automatically ends after one hour. */
export const BRAND_THEME_PREVIEW_MAX_AGE_SECONDS = 60 * 60;

/** Returns the registered theme or the safe Tropical Teal fallback. */
export function getBrandThemeId(value: string | null | undefined): BrandThemeId {
  return (
    BRAND_THEMES.find((theme) => theme.id === value)?.id ??
    DEFAULT_BRAND_THEME_ID
  );
}

/** Type guard used to reject unregistered theme identifiers at action boundaries. */
export function isBrandThemeId(value: unknown): value is BrandThemeId {
  return (
    typeof value === "string" &&
    BRAND_THEMES.some((theme) => theme.id === value)
  );
}
