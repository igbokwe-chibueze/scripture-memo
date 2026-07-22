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

export type MapTheme = {
  /** Stable internal identifier used by tests and future visual analytics. */
  id: "coastal" | "desert" | "temple";
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
  alt: "A winding coastal road through a sunlit Mediterranean village",
  imageSrc: "/images/maps/trail-map-1.png",
  width: 941,
  height: 1672,
  mobilePositions: TRAIL_POSITIONS,
  largePositions: TRAIL_POSITIONS,
};

const DESERT_THEME: MapTheme = {
  id: "desert",
  alt: "A winding stone road crossing a warm desert valley at sunset",
  imageSrc: "/images/maps/trail-map-2.png",
  width: 941,
  height: 1672,
  mobilePositions: TRAIL_POSITIONS,
  largePositions: TRAIL_POSITIONS,
};

const TEMPLE_THEME: MapTheme = {
  id: "temple",
  alt: "A mountain road climbing through gardens and ruins toward a temple",
  imageSrc: "/images/maps/trail-map-3.png",
  width: 941,
  height: 1672,
  mobilePositions: TRAIL_POSITIONS,
  largePositions: TRAIL_POSITIONS,
};

/** Public order controls the repeating Map 1 → Map 2 → Map 3 sequence. */
export const MAP_THEMES: readonly MapTheme[] = [
  COASTAL_THEME,
  DESERT_THEME,
  TEMPLE_THEME,
];

/**
 * Returns one illustration for any five-waypoint group. Modulo repetition means
 * newly appended curriculum groups continue the three-image cycle indefinitely.
 */
export function getMapTheme(groupIndex: number): MapTheme {
  const normalizedIndex =
    ((groupIndex % MAP_THEMES.length) + MAP_THEMES.length) % MAP_THEMES.length;
  const theme = MAP_THEMES[normalizedIndex];

  if (!theme) throw new Error("Map theme configuration is empty.");
  return theme;
}
