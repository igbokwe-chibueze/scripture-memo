"use client";

import { useState } from "react";
import { CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeCompletionScreen } from "@/features/gameplay/components/mode-completion-screen";

/**
 * Replays the production mode-completion screen without persistence.
 *
 * Fixed values make visual comparison repeatable and never invoke gameplay,
 * streak, reward, cooldown, or repository code.
 */
export function ModeCompletionPreview(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-emerald-300/40 bg-linear-to-br from-emerald-50 via-card to-amber-50 p-5 shadow-sm dark:from-emerald-950/25 dark:via-card dark:to-amber-950/20">
      <div>
        <h2 className="font-heading text-xl font-bold">Mode completion variants</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Repeatedly inspect the normal success state used after every mode.
        </p>
      </div>
      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          className="min-h-11 rounded-xl"
          onClick={() => setIsOpen(true)}
        >
          <CheckCircle2Icon aria-hidden="true" />
          Preview standard
        </Button>
      </div>

      {isOpen && (
        <ModeCompletionScreen
          completedMode="DRAG_DROP"
          nextMode="PUZZLE"
          isTestReplay={false}
          onContinue={() => setIsOpen(false)}
        />
      )}
    </section>
  );
}
