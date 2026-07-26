"use client";

import { DraggablePhrase } from "@/features/gameplay/components/modes/draggable-phrase";
import type { VersePhrase } from "@/features/gameplay/lib/phrase-generator";

/** Scrollable pool containing every phrase not currently placed in the verse. */
export function PhraseBank({
  phrases,
  phraseIndexes,
  selectedPhraseIndex,
  disabled,
  onSelect,
}: {
  phrases: readonly VersePhrase[];
  phraseIndexes: readonly number[];
  selectedPhraseIndex: number | null;
  disabled: boolean;
  onSelect: (phraseIndex: number) => void;
}): React.ReactNode {
  return (
    <section
      aria-labelledby="phrase-bank-title"
      className="rounded-2xl bg-muted/70 p-4 dark:bg-black/20"
    >
      <h3 id="phrase-bank-title" className="text-sm font-black text-foreground">
        Phrase bank
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Drag a phrase, or select it and tap an open position.
      </p>
      <div className="mt-3 flex max-h-64 flex-col gap-2 overflow-y-auto sm:flex-row sm:flex-wrap">
        {phraseIndexes.map((phraseIndex) => (
          <DraggablePhrase
            key={phraseIndex}
            phraseIndex={phraseIndex}
            text={phrases[phraseIndex]?.text ?? ""}
            selected={selectedPhraseIndex === phraseIndex}
            disabled={disabled}
            onSelect={() => onSelect(phraseIndex)}
          />
        ))}
        {phraseIndexes.length === 0 && (
          <p className="py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Every phrase has been placed. Check the order.
          </p>
        )}
      </div>
    </section>
  );
}
