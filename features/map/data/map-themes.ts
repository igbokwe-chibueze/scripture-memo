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
 * Initial mobile and large coordinates are identical until the owner exports
 * separately reviewed layouts from the upgraded positioner. The dual contract
 * is already live, so those later values are a data-only change.
 */
const COASTAL_POSITIONS = [
  { x: 47.14, y: 16.57 },
  { x: 42.84, y: 29.43 },
  { x: 44.99, y: 43.66 },
  { x: 50.33, y: 71.69 },
  { x: 32.07, y: 86 },
] as const;

const DESERT_POSITIONS = [
  { x: 62, y: 15 },
  { x: 61, y: 31 },
  { x: 57, y: 47 },
  { x: 39, y: 63 },
  { x: 43, y: 86 },
] as const;

const TEMPLE_POSITIONS = [
  { x: 55, y: 13 },
  { x: 52, y: 28 },
  { x: 46, y: 44 },
  { x: 53, y: 69 },
  { x: 45, y: 86 },
] as const;

const COASTAL_THEME: MapTheme = {
  id: "coastal",
  alt: "A winding coastal road through a sunlit Mediterranean village",
  imageSrc: "/images/maps/trail-map-1.png",
  width: 941,
  height: 1672,
  mobilePositions: COASTAL_POSITIONS,
  largePositions: COASTAL_POSITIONS,
};

const DESERT_THEME: MapTheme = {
  id: "desert",
  alt: "A winding stone road crossing a warm desert valley at sunset",
  imageSrc: "/images/maps/trail-map-2.png",
  width: 941,
  height: 1672,
  mobilePositions: DESERT_POSITIONS,
  largePositions: DESERT_POSITIONS,
};

const TEMPLE_THEME: MapTheme = {
  id: "temple",
  alt: "A mountain road climbing through gardens and ruins toward a temple",
  imageSrc: "/images/maps/trail-map-3.png",
  width: 941,
  height: 1672,
  mobilePositions: TEMPLE_POSITIONS,
  largePositions: TEMPLE_POSITIONS,
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
