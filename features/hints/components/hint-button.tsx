"use client";

import { useState, useTransition } from "react";
import { LightbulbIcon } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { showActionError } from "@/lib/errors/show-action-error";
import { useHintAction as consumeHintAction } from "@/features/hints/actions/use-hint.action";
import { HintModal } from "@/features/hints/components/hint-modal";

/** Consumes one server-authorized hint and opens its canonical verse reference. */
export function HintButton({
  sessionId,
  initialBalance,
  disabled,
  isTestReplay = false,
  testReference,
  testVerseText,
}: {
  sessionId: string;
  initialBalance: number;
  disabled: boolean;
  isTestReplay?: boolean;
  testReference?: string;
  testVerseText?: string;
}): React.ReactNode {
  const [balance, setBalance] = useState(initialBalance);
  const [hint, setHint] = useState<{ reference: string; verseText: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUseHint = (): void => {
    if (isTestReplay && testReference && testVerseText) {
      setHint({ reference: testReference, verseText: testVerseText });
      toast.info("Admin test hint opened. No hint was consumed.", { duration: 4_000 });
      return;
    }

    startTransition(async () => {
      const result = await consumeHintAction({ sessionId });
      if (!result.success) {
        showActionError(result);
        return;
      }
      if (!result.data) return;
      setBalance(result.data.remainingHints);
      setHint({
        reference: result.data.reference,
        verseText: result.data.verseText,
      });
      toast.success(result.message, { duration: 4_000 });
    });
  };

  return (
    <>
      <LoadingButton
        type="button"
        variant="ghost"
        isPending={isPending}
        pendingLabel="Opening hint"
        className="min-h-11 w-full justify-center rounded-xl text-amber-800 hover:bg-amber-100 hover:text-amber-950 dark:text-amber-200 dark:hover:bg-amber-300/10 dark:hover:text-amber-100"
        disabled={disabled || (!isTestReplay && balance === 0)}
        onClick={handleUseHint}
      >
        <LightbulbIcon data-icon="inline-start" aria-hidden="true" />
        {isTestReplay
          ? "Test hint · unlimited"
          : balance === 0
            ? "No hints remaining"
            : `Use hint · ${balance} remaining`}
      </LoadingButton>
      <HintModal
        open={hint !== null}
        reference={hint?.reference ?? ""}
        verseText={hint?.verseText ?? ""}
        onOpenChange={(open) => {
          if (!open) setHint(null);
        }}
      />
    </>
  );
}
