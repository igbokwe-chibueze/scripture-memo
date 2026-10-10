"use client";

import { useDroppable } from "@dnd-kit/core";
import { GripVerticalIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GAMEPLAY_TILE_STATE_STYLES } from "@/features/gameplay/constants/gameplay-state-styles";

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
        "inline-flex min-h-12 min-w-28 max-w-full items-center justify-center gap-2 rounded-tile border-2 border-dashed px-3 py-2 text-center font-bold transition",
        GAMEPLAY_TILE_STATE_STYLES.idle,
        GAMEPLAY_TILE_STATE_STYLES.focus,
        selectedPhraseAvailable && !placedText && GAMEPLAY_TILE_STATE_STYLES.selected,
        isOver && GAMEPLAY_TILE_STATE_STYLES.dropTarget,
        feedback === "correct" && GAMEPLAY_TILE_STATE_STYLES.correct,
        feedback === "incorrect" && GAMEPLAY_TILE_STATE_STYLES.incorrect,
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
