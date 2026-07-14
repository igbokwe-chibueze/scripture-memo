/**
 * Pure coordinate helpers for the development-only map positioner.
 *
 * The editor stores coordinates as percentages rather than source-image pixels.
 * That makes one exported layout work at every rendered width, provided the PNG
 * keeps the same aspect ratio. These helpers have no browser or database access,
 * which keeps their behavior deterministic and safe to unit test.
 */

/** The center point of one waypoint, measured as a percentage of the PNG. */
export type MapPosition = {
  x: number;
  y: number;
};

/**
 * Starting coordinates reproduce the current winding trail's ten-node rhythm.
 * They provide usable markers immediately after a PNG is selected; designers
 * are expected to drag them onto the exact centers of their own trail artwork.
 */
export const DEFAULT_MAP_POSITIONS: readonly MapPosition[] = [
  { x: 50, y: 8.06 },
  { x: 25, y: 17.01 },
  { x: 60, y: 25.97 },
  { x: 76, y: 34.93 },
  { x: 43, y: 43.88 },
  { x: 23, y: 52.84 },
  { x: 48, y: 61.79 },
  { x: 76, y: 70.75 },
  { x: 56, y: 79.7 },
  { x: 28, y: 88.66 },
] as const;

/**
 * Keeps a coordinate inside the visible image and rounds it for readable output.
 * Two decimal places are precise to well below one CSS pixel on the map's normal
 * mobile width while avoiding noisy floating-point values in copied config.
 */
export function normalizeMapPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

/**
 * Converts a pointer location inside the rendered image into normalized percent
 * coordinates. Bounding dimensions are validated so an image that has not laid
 * out yet fails safely at the origin instead of producing Infinity or NaN.
 */
export function calculateMapPosition(
  clientX: number,
  clientY: number,
  bounds: { left: number; top: number; width: number; height: number },
): MapPosition {
  if (bounds.width <= 0 || bounds.height <= 0) return { x: 0, y: 0 };

  return {
    x: normalizeMapPercentage(((clientX - bounds.left) / bounds.width) * 100),
    y: normalizeMapPercentage(((clientY - bounds.top) / bounds.height) * 100),
  };
}

/**
 * Produces paste-ready TypeScript for a map-theme configuration. The tool never
 * writes application files itself: explicit clipboard export keeps every source
 * change visible and reviewable in VS Code before it becomes part of the map.
 */
export function formatMapPositions(positions: readonly MapPosition[]): string {
  const rows = positions.map(
    ({ x, y }) => `  { x: ${normalizeMapPercentage(x)}, y: ${normalizeMapPercentage(y)} },`,
  );

  return `[\n${rows.join("\n")}\n] as const`;
}
