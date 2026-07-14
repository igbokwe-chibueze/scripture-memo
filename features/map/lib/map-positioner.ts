/**
 * Pure configuration and coordinate helpers for the development map positioner.
 *
 * The browser editor can model different image dimensions, waypoint counts,
 * viewport widths, and button diameters for mobile and large layouts. All
 * calculations remain deterministic and side-effect free: these helpers never
 * read files, use browser storage, call a server, or access either database.
 */

/** The center point of one waypoint, measured as a percentage of the PNG. */
export type MapPosition = {
  x: number;
  y: number;
};

export type MapPositionerLayout = {
  /** Simulated CSS width of the rendered map. */
  previewWidth: number;
  /** Diameter of ordinary waypoint buttons in CSS pixels. */
  buttonSize: number;
  /** Diameter of the current waypoint button in CSS pixels. */
  currentButtonSize: number;
  /** Independently authored centers for this responsive layout. */
  positions: readonly MapPosition[];
};

export type MapPositionerConfiguration = {
  image: { width: number; height: number };
  waypointCount: number;
  breakpoint: number;
  currentWaypoint: number;
  mobile: MapPositionerLayout;
  large: MapPositionerLayout;
};

const DEFAULT_X_PATTERN = [50, 35, 65, 40, 60] as const;

/**
 * Generates an evenly spaced starting layout for any supported marker count.
 * Alternating X values expose every marker instead of stacking them in one line;
 * the 10%–90% Y range leaves initial room for full button diameters.
 */
export function createDefaultMapPositions(count: number): MapPosition[] {
  const safeCount = Math.max(1, Math.min(20, Math.trunc(count) || 1));

  return Array.from({ length: safeCount }, (_, index) => ({
    x: DEFAULT_X_PATTERN[index % DEFAULT_X_PATTERN.length] ?? 50,
    y: safeCount === 1 ? 50 : Math.round((10 + (80 * index) / (safeCount - 1)) * 100) / 100,
  }));
}

/** Five markers match Map A's current one-image section contract. */
export const DEFAULT_MAP_POSITIONS: readonly MapPosition[] =
  createDefaultMapPositions(5);

/**
 * Preserves existing work when the requested waypoint count changes. New
 * markers receive generated defaults; reducing the count trims only trailing
 * markers, so coordinates for retained waypoints remain untouched.
 */
export function resizeMapPositions(
  positions: readonly MapPosition[],
  count: number,
): MapPosition[] {
  const defaults = createDefaultMapPositions(count);
  return defaults.map((fallback, index) => {
    const existing = positions[index];
    return existing ? { ...existing } : fallback;
  });
}

/** Keeps a percentage inside the image and rounds it for readable output. */
export function normalizeMapPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
}

/** Converts a rendered pointer location into normalized image percentages. */
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
 * Reports whether the circular button—not merely its center—crosses an image
 * boundary at the simulated rendered size. This gives the designer immediate
 * evidence of mobile clipping before coordinates enter application code.
 */
export function isWaypointButtonClipped(
  position: MapPosition,
  buttonSize: number,
  canvasWidth: number,
  canvasHeight: number,
): boolean {
  if (canvasWidth <= 0 || canvasHeight <= 0 || buttonSize <= 0) return true;
  const radius = buttonSize / 2;
  const centerX = (normalizeMapPercentage(position.x) / 100) * canvasWidth;
  const centerY = (normalizeMapPercentage(position.y) / 100) * canvasHeight;

  return (
    centerX - radius < 0 ||
    centerX + radius > canvasWidth ||
    centerY - radius < 0 ||
    centerY + radius > canvasHeight
  );
}

/**
 * Calculates one uniform Fit-mode scale for both the PNG and its controls.
 * Capping at 1 avoids enlarging a design beyond its configured CSS width, while
 * using the tighter width/height constraint guarantees the whole portrait fits
 * inside the available workspace without distorting its aspect ratio.
 */
export function calculateMapPreviewScale(
  designWidth: number,
  designHeight: number,
  availableWidth: number,
  availableHeight: number,
): number {
  if (
    designWidth <= 0 ||
    designHeight <= 0 ||
    availableWidth <= 0 ||
    availableHeight <= 0
  ) {
    return 1;
  }

  return Math.min(1, availableWidth / designWidth, availableHeight / designHeight);
}

/** Produces paste-ready TypeScript for one responsive coordinate array. */
export function formatMapPositions(positions: readonly MapPosition[]): string {
  const rows = positions.map(
    ({ x, y }) => `  { x: ${normalizeMapPercentage(x)}, y: ${normalizeMapPercentage(y)} },`,
  );

  return `[\n${rows.join("\n")}\n] as const`;
}

/**
 * Exports the full design contract needed to reproduce the preview accurately.
 * The tool writes only to the clipboard; applying this object to Map A remains
 * an explicit, reviewable source-code change.
 */
export function formatMapPositionerConfiguration(
  configuration: MapPositionerConfiguration,
): string {
  const indentPositions = (positions: readonly MapPosition[]): string =>
    formatMapPositions(positions)
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n");

  return `{
  image: { width: ${configuration.image.width}, height: ${configuration.image.height} },
  waypointCount: ${configuration.waypointCount},
  breakpoint: ${configuration.breakpoint},
  currentWaypoint: ${configuration.currentWaypoint},
  mobile: {
    previewWidth: ${configuration.mobile.previewWidth},
    buttonSize: ${configuration.mobile.buttonSize},
    currentButtonSize: ${configuration.mobile.currentButtonSize},
    positions:
${indentPositions(configuration.mobile.positions)},
  },
  large: {
    previewWidth: ${configuration.large.previewWidth},
    buttonSize: ${configuration.large.buttonSize},
    currentButtonSize: ${configuration.large.currentButtonSize},
    positions:
${indentPositions(configuration.large.positions)},
  },
} as const`;
}
