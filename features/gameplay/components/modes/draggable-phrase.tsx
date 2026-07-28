"use client";

import { useDraggable } from "@dnd-kit/core";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DRAGGABLE_TILE_BEVEL,
  SELECTED_TILE_BEVEL,
} from "@/features/gameplay/constants/draggable-tile-styles";

/** Position-identified phrase tile supporting pointer, keyboard, and tap play. */
export function DraggablePhrase({
  phraseIndex,
  text,
  selected,
  disabled,
  onSelect,
}: {
  phraseIndex: number;
  text: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}): React.ReactNode {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `phrase-${phraseIndex}`,
    disabled,
    data: { phraseIndex },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "flex min-h-14 w-full touch-none items-center gap-3 rounded-2xl border px-4 py-3 text-left font-bold text-violet-950 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none dark:text-violet-50 sm:w-auto sm:min-w-56",
        DRAGGABLE_TILE_BEVEL,
        selected && SELECTED_TILE_BEVEL,
        isDragging && "z-20 opacity-35",
      )}
      disabled={disabled}
      {...listeners}
      {...attributes}
      aria-pressed={selected}
      aria-label={`${text}. ${selected ? "Selected; choose a phrase slot." : "Select or drag this phrase."}`}
      onClick={onSelect}
    >
      <GripVerticalIcon className="size-5 shrink-0 opacity-60" aria-hidden="true" />
      <span>{text}</span>
    </button>
  );
}
