/**
 * Shared depth treatment for word and phrase bank game pieces.
 *
 * Unlike action buttons, these pieces use no inset or offset shadows. Their
 * tactile response comes only from scale on the perceived Z-axis, preventing a
 * light bevel edge from appearing above or below either tile state.
 */
export const DRAGGABLE_TILE_BEVEL =
  "border-violet-400/45 bg-violet-100 shadow-none transition-[transform,background-color,border-color] duration-150 hover:scale-[1.02] hover:border-violet-500/70 hover:bg-violet-200 active:scale-[0.99] disabled:scale-100 disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 dark:border-violet-500/45 dark:bg-violet-500/18 dark:hover:border-violet-400/65 dark:hover:bg-violet-500/24";

/** Amber selection changes state color without introducing another depth effect. */
export const SELECTED_TILE_BEVEL =
  "border-amber-400 bg-amber-300 text-slate-950 shadow-none hover:bg-amber-300 dark:border-amber-300 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-300";

/** The pointer-following copy remains flat so no legacy shadow reappears. */
export const DRAG_OVERLAY_TILE_BEVEL =
  "border border-amber-400 bg-amber-300 text-slate-950 shadow-none";
