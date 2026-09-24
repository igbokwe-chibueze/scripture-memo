/**
 * Static artwork and responsive waypoint alignment for Map A.
 *
 * Every illustration owns exactly five mobile and five large-screen centers.
 * Keeping both sets explicit lets the project owner align real button sizes in
 * the development positioner rather than relying on one percentage layout to
 * fit materially different viewports. This module is presentation-only: it
 * cannot alter curriculum order, unlocks, rewards, progress, or database data.
 */

export type MapThemePosition = {
  /** Horizontal center measured from the PNG's left edge. */
  x: number;
  /** Vertical center measured from the PNG's top edge. */
  y: number;
};

/** Closed set of built-in PNGs allowed in persistent trail assignments. */
export const MAP_THEME_IDS = ["coastal", "desert", "temple"] as const;

export type MapThemeId = (typeof MAP_THEME_IDS)[number];

export type MapTheme = {
  /** Stable internal identifier used by tests and future visual analytics. */
  id: MapThemeId;
  /** Short human-readable name shown in administrator artwork controls. */
  name: string;
  /** Accessible description of the illustrated setting. */
  alt: string;
  /** Root-relative path under `public/`; no remote image host is involved. */
  imageSrc: string;
  /** Intrinsic source dimensions preserve layout while the PNG loads. */
  width: 941;
  height: 1672;
  /** Five centers tuned for the mobile button dimensions. */
  mobilePositions: readonly MapThemePosition[];
  /** Five centers tuned independently for the larger button dimensions. */
  largePositions: readonly MapThemePosition[];
};

/** Narrows untrusted database strings to the built-in theme catalogue. */
export function isMapThemeId(value: string | null | undefined): value is MapThemeId {
  return MAP_THEME_IDS.some((themeId) => themeId === value);
}

/**
 * Every current and future trail illustration uses this owner-approved rhythm
 * on both sides of the 640px breakpoint. A single source of truth prevents a
 * newly added theme from silently drifting into map-specific alignment unless
 * the project owner explicitly approves a different position set.
 */
const TRAIL_POSITIONS = [
  { x: 50, y: 10 },
  { x: 35, y: 30 },
  { x: 65, y: 50 },
  { x: 40, y: 70 },
  { x: 60, y: 90 },
] as const;

const COASTAL_THEME: MapTheme = {
  id: "coastal",
  name: "Coastal village",
  alt: "A winding coastal road through a sunlit Mediterranean village",
  imageSrc: "/images/maps/trail-map-1.png",
  width: 941,
  height: 1672,
  mobilePositions: TRAIL_POSITIONS,
  largePositions: TRAIL_POSITIONS,
};

const DESERT_THEME: MapTheme = {
  id: "desert",
  name: "Desert valley",
  alt: "A winding stone road crossing a warm desert valley at sunset",
  imageSrc: "/images/maps/trail-map-2.png",
  width: 941,
  height: 1672,
  mobilePositions: TRAIL_POSITIONS,
  largePositions: TRAIL_POSITIONS,
};

const TEMPLE_THEME: MapTheme = {
  id: "temple",
  name: "Temple gardens",
  alt: "A mountain road climbing through gardens and ruins toward a temple",
  imageSrc: "/images/maps/trail-map-3.png",
  width: 941,
  height: 1672,
  mobilePositions: TRAIL_POSITIONS,
  largePositions: TRAIL_POSITIONS,
};

/** Public catalogue powers previews and validates durable trail assignments. */
export const MAP_THEMES: readonly MapTheme[] = [
  COASTAL_THEME,
  DESERT_THEME,
  TEMPLE_THEME,
];

/**
 * Resolves one five-waypoint trail's chosen artwork, falling back to the
 * original repeating catalogue order when no administrator assignment exists.
 *
 * Admin assignments are global and take precedence. The fallback cycles
 * Coastal → Desert → Temple by trail number, preserving the map sequence that
 * existed before assignment controls were added. Theme IDs are checked against
 * the local catalogue so stale or malformed stored values safely use that
 * original sequence instead.
 */
export function getMapThemeForTrail(
  trailNumber: number,
  assignedThemeId?: string | null,
): MapTheme {
  if (!Number.isSafeInteger(trailNumber) || trailNumber < 1) {
    throw new Error("Trail number must be a positive safe integer.");
  }

  const assignedTheme = MAP_THEMES.find(({ id }) => id === assignedThemeId);
  if (assignedTheme) return assignedTheme;

  // Trail numbering is one-based, while the catalogue cycle is zero-based.
  // This is deterministic, writes no fallback rows, and matches the original
  // artwork selection for every unassigned trail.
  const themeIndex = (trailNumber - 1) % MAP_THEMES.length;
  const theme = MAP_THEMES[themeIndex];
  if (!theme) throw new Error("Map theme configuration is empty.");
  return theme;
}
