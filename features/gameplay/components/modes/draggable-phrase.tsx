"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `phrase-${phraseIndex}`,
    disabled,
    data: { phraseIndex },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "flex min-h-14 w-full touch-none items-center gap-3 rounded-2xl border border-violet-400/35 bg-violet-100 px-4 py-3 text-left font-bold text-violet-950 shadow-sm transition sm:w-auto sm:min-w-56",
        "hover:border-violet-500/70 hover:bg-violet-200 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none dark:border-violet-300/30 dark:bg-violet-500/15 dark:text-violet-50 dark:hover:border-violet-300/70 dark:hover:bg-violet-500/25",
        selected && "border-amber-300 bg-amber-300 text-slate-950 ring-2 ring-amber-300/30",
        isDragging && "z-20 scale-[1.02] opacity-70 shadow-xl",
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
