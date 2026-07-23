"use client";

import { DraggableWord } from "@/features/gameplay/components/modes/draggable-word";
import type { VerseToken } from "@/features/gameplay/lib/verse-tokenizer";

/** Scrollable pool containing only tokens not currently placed in a blank. */
export function WordBank({
  tokens,
  tokenIndexes,
  selectedTokenIndex,
  disabled,
  onSelect,
}: {
  tokens: readonly VerseToken[];
  tokenIndexes: readonly number[];
  selectedTokenIndex: number | null;
  disabled: boolean;
  onSelect: (tokenIndex: number) => void;
}): React.ReactNode {
  return (
    <section aria-labelledby="word-bank-title" className="rounded-2xl bg-muted/70 p-4 dark:bg-black/20">
      <h3 id="word-bank-title" className="text-sm font-black text-foreground">
        Word bank
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">Drag a word, or select it and tap a blank.</p>
      <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {tokenIndexes.map((tokenIndex) => (
          <DraggableWord
            key={tokenIndex}
            tokenIndex={tokenIndex}
            text={tokens[tokenIndex]?.wordText ?? ""}
            selected={selectedTokenIndex === tokenIndex}
            disabled={disabled}
            onSelect={() => onSelect(tokenIndex)}
          />
        ))}
        {tokenIndexes.length === 0 && (
          <p className="py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Every word has been placed. Check your answer.
          </p>
        )}
      </div>
    </section>
  );
}
