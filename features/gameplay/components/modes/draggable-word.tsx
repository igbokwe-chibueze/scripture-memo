"use client";

import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import {
  DRAGGABLE_TILE_BEVEL,
  SELECTED_TILE_BEVEL,
} from "@/features/gameplay/constants/draggable-tile-styles";

/** One position-identified word that supports drag, keyboard, and tap selection. */
export function DraggableWord({
  tokenIndex,
  text,
  selected,
  disabled,
  onSelect,
}: {
  tokenIndex: number;
  text: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}): React.ReactNode {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `word-${tokenIndex}`,
    disabled,
    data: { tokenIndex },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "min-h-11 touch-none rounded-xl border px-3 py-2 font-bold text-violet-950 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none dark:text-violet-50",
        DRAGGABLE_TILE_BEVEL,
        selected && SELECTED_TILE_BEVEL,
        isDragging && "z-20 opacity-35",
      )}
      disabled={disabled}
      {...listeners}
      {...attributes}
      aria-pressed={selected}
      aria-label={`${text}. ${selected ? "Selected; choose a blank." : "Select or drag this word."}`}
      onClick={onSelect}
    >
      {text}
    </button>
  );
}
