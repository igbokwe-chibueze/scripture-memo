/**
 * Shared interaction-state recipes for word and phrase tiles.
 *
 * These strings are deliberately limited to presentation. Gameplay components
 * continue to calculate whether a tile is available, selected, being hovered,
 * correct, incorrect, or locked. Keeping the state colors here prevents Drag &
 * Drop, Puzzle, and Swap from assigning different meanings to the same color.
 * The flat tile treatment also preserves the current game-piece geometry and
 * avoids introducing another bevel or shadow system.
 */
export const GAMEPLAY_TILE_STATE_STYLES = {
  idle: "border-border bg-card text-foreground",
  available:
    "border-available-border bg-available-subtle text-available-text hover:border-available-border hover:bg-available-subtle",
  selected:
    "border-selection-border bg-selection-subtle text-selection-text ring-2 ring-selection-border",
  dropTarget:
    "border-selection-border bg-selection-subtle text-selection-text outline-2 outline-dashed outline-selection-border",
  correct:
    "border-success-border bg-success-subtle text-success-text",
  incorrect:
    "border-error-border bg-error-subtle text-error-text",
  locked: "border-border bg-disabled text-disabled-foreground",
  focus: "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring",
} as const;

/** Shared available-state finish for draggable pieces without extra depth. */
export const DRAGGABLE_TILE_BEVEL =
  `${GAMEPLAY_TILE_STATE_STYLES.available} shadow-none transition-[transform,background-color,border-color] duration-150 hover:scale-[1.02] active:scale-[0.99] disabled:scale-100 disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100`;

/** Selection changes a tile state without changing its geometry or depth. */
export const SELECTED_TILE_BEVEL =
  `${GAMEPLAY_TILE_STATE_STYLES.selected} shadow-none hover:bg-selection-subtle`;

/** The pointer-following copy remains flat and follows the selection palette. */
export const DRAG_OVERLAY_TILE_BEVEL =
  "border border-selection-border bg-selection text-selection-foreground shadow-none";
