"use client";

import { useTranslations } from "next-intl";

import { Clock3Icon, RefreshCwIcon } from "lucide-react";
import { LunaMascot } from "@/components/shared/luna-mascot";
import { Button } from "@/components/ui/button";

export type TimedAttemptExpiredProps = {
  /** Human-readable current mode name derived from the trusted mode enum. */
  modeLabel: string;
  /** Prevents duplicate attempt starts while the Server Action is pending. */
  isPending: boolean;
  /** Starts a new server-timed attempt for the same mode. */
  onRetry: () => void;
};

/**
 * Reassures the learner after one server-timed attempt expires.
 *
 * The screen never claims to restore or extend the expired attempt. It offers a
 * fresh attempt through the existing server action while accurately explaining
 * that previously completed modes remain persisted and unchanged.
 */
export function TimedAttemptExpired({
  modeLabel,
  isPending,
  onRetry,
}: TimedAttemptExpiredProps): React.ReactNode {
  const t = useTranslations("Gameplay");
  return (
    <div className="relative my-auto flex w-full max-w-md flex-col items-center overflow-hidden rounded-dialog border border-border bg-card px-5 py-7 text-center text-foreground shadow-lg">
      <div
        className="absolute -bottom-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/5 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative h-52 w-44">
        <LunaMascot
          pose="retry"
          decorative
          sizes="176px"
          className="h-full w-full"
        />
      </div>
      <p className="relative mt-2 inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
        <Clock3Icon className="size-4" aria-hidden="true" />
        {t("attemptExpired")}
      </p>
      <h2 className="relative mt-2 font-heading text-3xl font-bold">
        {t("progressSafe")}
      </h2>
      <p className="relative mt-3 max-w-sm text-sm leading-6 font-medium text-muted-foreground">
        {t("expiredDetail", { mode: modeLabel })}
      </p>
      <Button
        type="button"
        size="lg"
        className="relative mt-7 w-full max-w-xs"
        disabled={isPending}
        onClick={onRetry}
      >
        <RefreshCwIcon aria-hidden="true" />
        {isPending ? t("starting") : t("tryModeAgain", { mode: modeLabel })}
      </Button>
    </div>
  );
}
