"use client";

import { useEffect, useRef, useState } from "react";
import { BellRingIcon, TimerResetIcon } from "lucide-react";
import { toast } from "sonner";

import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { CountdownTimer } from "@/components/shared/countdown-timer";
import { FormError } from "@/components/shared/form-error";
import { FormSuccess } from "@/components/shared/form-success";
import { LoadingButton } from "@/components/shared/loading-button";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Button } from "@/components/ui/button";

/**
 * Exercises interactive Phase 2 primitives from the internal foundation preview.
 *
 * This component is intentionally isolated from production features. It verifies
 * observable acceptance criteria—toast delivery, duplicate-tap prevention, theme
 * switching, confirmation, and countdown expiration—without introducing mock
 * gameplay state or temporary controls into the public application home page.
 */
export function FoundationControls(): React.ReactNode {
  const [isPending, setIsPending] = useState(false);
  const [countdownTarget, setCountdownTarget] = useState<Date | null>(null);
  const [countdownExpired, setCountdownExpired] = useState(false);
  const pendingTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      // WHY: Clear the demonstration timer if navigation unmounts this preview.
      // This prevents a delayed state update after the owning UI no longer exists.
      if (pendingTimerRef.current !== null) {
        window.clearTimeout(pendingTimerRef.current);
      }
    },
    [],
  );

  /**
   * Simulates a short mutation so the loading button's locked state is visible.
   * A real feature will derive this state from useActionState or useTransition.
   */
  const demonstratePendingState = (): void => {
    setIsPending(true);
    pendingTimerRef.current = window.setTimeout(() => {
      setIsPending(false);
      toast.success("Pending state completed successfully.");
    }, 1500);
  };

  /** Starts a five-second observable countdown using an event-time timestamp. */
  const startCountdown = (): void => {
    setCountdownExpired(false);
    setCountdownTarget(new Date(Date.now() + 5000));
  };

  return (
    <section className="space-y-5" aria-labelledby="interactive-foundation-title">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="interactive-foundation-title" className="font-heading text-xl font-bold">
            Interactive checks
          </h2>
          <p className="text-sm text-muted-foreground">
            Exercise global feedback, themes, pending state, and timing.
          </p>
        </div>
        <ThemeSwitcher />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          className="min-h-11"
          onClick={() => toast.success("Sonner is ready for your journey!")}
        >
          <BellRingIcon aria-hidden="true" />
          Test success toast
        </Button>
        <LoadingButton
          type="button"
          isPending={isPending}
          pendingLabel="Saving progress"
          onClick={demonstratePendingState}
        >
          Test pending button
        </LoadingButton>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Countdown callback</h3>
            <p className="text-sm text-muted-foreground">
              Start five seconds and wait for the expiration confirmation.
            </p>
          </div>
          <Button type="button" variant="outline" className="min-h-11" onClick={startCountdown}>
            <TimerResetIcon aria-hidden="true" />
            Start countdown
          </Button>
        </div>
        {countdownTarget && (
          <div className="mt-4">
            <CountdownTimer
              targetDate={countdownTarget}
              onExpire={() => setCountdownExpired(true)}
              label="Foundation test countdown"
            />
          </div>
        )}
        {countdownExpired && (
          <FormSuccess
            className="mt-4"
            message="Countdown expired and onExpire fired exactly as expected."
          />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormError message="Example safe form error feedback." />
        <FormSuccess message="Example persistent success feedback." />
      </div>

      <ConfirmationDialog
        trigger={
          <Button type="button" variant="outline" className="min-h-11">
            Test confirmation dialog
          </Button>
        }
        title="Confirm foundation action"
        description="This preview action changes no application data."
        confirmLabel="Confirm test"
        onConfirm={() => toast.info("Confirmation callback fired.")}
      />
    </section>
  );
}
