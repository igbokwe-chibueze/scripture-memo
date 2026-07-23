"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

/** Droppable and tappable verse blank with per-slot validation feedback. */
export function BlankSlot({
  slotIndex,
  placedText,
  selectedWordAvailable,
  feedback,
  disabled,
  onPlaceSelected,
  onReturnWord,
}: {
  slotIndex: number;
  placedText: string | null;
  selectedWordAvailable: boolean;
  feedback: "correct" | "incorrect" | null;
  disabled: boolean;
  onPlaceSelected: () => void;
  onReturnWord: () => void;
}): React.ReactNode {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slotIndex}`,
    disabled,
    data: { slotIndex },
  });

  const handleClick = (): void => {
    if (placedText) onReturnWord();
    else if (selectedWordAvailable) onPlaceSelected();
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "inline-flex min-h-11 min-w-20 touch-manipulation items-center justify-center rounded-xl border-2 border-dashed px-2.5 py-1 align-middle font-bold transition",
        "border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none dark:border-slate-500 dark:bg-slate-800/80 dark:text-slate-100",
        selectedWordAvailable && !placedText && "border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-300 dark:bg-amber-300/15 dark:text-amber-100",
        isOver && "scale-105 border-emerald-500 bg-emerald-100 text-emerald-950 shadow-lg shadow-emerald-500/15 dark:border-emerald-300 dark:bg-emerald-300/20 dark:text-emerald-100",
        feedback === "correct" && "border-emerald-500 bg-emerald-100 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-400/15 dark:text-emerald-100",
        feedback === "incorrect" && "border-red-500 bg-red-100 text-red-950 dark:border-red-400 dark:bg-red-400/15 dark:text-red-100",
      )}
      disabled={disabled || (!placedText && !selectedWordAvailable)}
      aria-label={
        placedText
          ? `${placedText} placed in blank ${slotIndex + 1}. Activate to return it to the word bank.`
          : `Blank ${slotIndex + 1}${selectedWordAvailable ? "; activate to place selected word" : ""}.`
      }
      onClick={handleClick}
    >
      {placedText ?? "•••"}
    </button>
  );
}
