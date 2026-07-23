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
        "border-slate-500 bg-slate-800/80 text-slate-100 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:outline-none",
        selectedWordAvailable && !placedText && "border-amber-300 bg-amber-300/15 text-amber-100",
        isOver && "scale-105 border-emerald-300 bg-emerald-300/20 text-emerald-100 shadow-lg shadow-emerald-500/15",
        feedback === "correct" && "border-emerald-400 bg-emerald-400/15 text-emerald-100",
        feedback === "incorrect" && "border-red-400 bg-red-400/15 text-red-100",
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
