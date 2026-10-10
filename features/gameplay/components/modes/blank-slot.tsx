"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { GAMEPLAY_TILE_STATE_STYLES } from "@/features/gameplay/constants/gameplay-state-styles";

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
        "inline-flex min-h-11 min-w-20 touch-manipulation items-center justify-center rounded-tile border-2 border-dashed px-2.5 py-1 align-middle font-bold transition",
        GAMEPLAY_TILE_STATE_STYLES.idle,
        GAMEPLAY_TILE_STATE_STYLES.focus,
        selectedWordAvailable && !placedText && GAMEPLAY_TILE_STATE_STYLES.selected,
        isOver && GAMEPLAY_TILE_STATE_STYLES.dropTarget,
        feedback === "correct" && GAMEPLAY_TILE_STATE_STYLES.correct,
        feedback === "incorrect" && GAMEPLAY_TILE_STATE_STYLES.incorrect,
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
