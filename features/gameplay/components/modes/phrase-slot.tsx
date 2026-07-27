"use client";

import { useDroppable } from "@dnd-kit/core";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Inline phrase destination that remains part of the readable verse sentence. */
export function PhraseSlot({
  slotIndex,
  placedText,
  selectedPhraseAvailable,
  feedback,
  disabled,
  onPlaceSelected,
  onReturnPhrase,
}: {
  slotIndex: number;
  placedText: string | null;
  selectedPhraseAvailable: boolean;
  feedback: "correct" | "incorrect" | null;
  disabled: boolean;
  onPlaceSelected: () => void;
  onReturnPhrase: () => void;
}): React.ReactNode {
  const { isOver, setNodeRef } = useDroppable({
    id: `phrase-slot-${slotIndex}`,
    disabled,
    data: { slotIndex },
  });

  const handleClick = (): void => {
    if (placedText) onReturnPhrase();
    else if (selectedPhraseAvailable) onPlaceSelected();
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "inline-flex min-h-12 min-w-28 max-w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-2 text-center font-bold transition",
        "border-border bg-background text-foreground focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none dark:border-slate-500 dark:bg-slate-800/80 dark:text-slate-100",
        selectedPhraseAvailable && !placedText && "border-amber-500 bg-amber-100 text-amber-950 dark:border-amber-300 dark:bg-amber-300/15 dark:text-amber-100",
        isOver && "scale-[1.02] border-emerald-500 bg-emerald-100 text-emerald-950 shadow-lg shadow-emerald-500/15 dark:border-emerald-300 dark:bg-emerald-300/20 dark:text-emerald-100",
        feedback === "correct" && "border-emerald-500 bg-emerald-100 text-emerald-950 dark:border-emerald-400 dark:bg-emerald-400/15 dark:text-emerald-100",
        feedback === "incorrect" && "border-red-500 bg-red-100 text-red-950 dark:border-red-400 dark:bg-red-400/15 dark:text-red-100",
      )}
      disabled={disabled || (!placedText && !selectedPhraseAvailable)}
      aria-label={
        placedText
          ? `${placedText} placed in phrase position ${slotIndex + 1}. Activate to return it to the phrase bank.`
          : `Empty phrase position ${slotIndex + 1}${selectedPhraseAvailable ? "; activate to place selected phrase" : ""}.`
      }
      onClick={handleClick}
    >
      {placedText ? (
        <>
          <GripVerticalIcon className="size-5 shrink-0 opacity-50" aria-hidden="true" />
          <span>{placedText}</span>
        </>
      ) : (
        <span aria-hidden="true">•••</span>
      )}
    </button>
  );
}
