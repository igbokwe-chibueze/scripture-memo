"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `word-${tokenIndex}`,
    disabled,
    data: { tokenIndex },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "min-h-11 touch-none rounded-xl border border-violet-300/30 bg-violet-500/15 px-3 py-2 font-bold text-violet-50 shadow-sm transition",
        "hover:border-violet-300/70 hover:bg-violet-500/25 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none",
        selected && "border-amber-300 bg-amber-300 text-slate-950 ring-2 ring-amber-300/30",
        isDragging && "z-20 scale-105 opacity-70 shadow-xl",
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
