"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type CountdownTimerProps = {
  /** Absolute instant at which the countdown reaches zero. */
  targetDate: Date;
  /** Called once when the current target first reaches or passes zero. */
  onExpire?: () => void;
  /** Optional accessible label identifying what the countdown unlocks. */
  label?: string;
  /** Extends visual placement without altering timing behavior. */
  className?: string;
};

type RemainingTime = {
  hours: string;
  minutes: string;
  seconds: string;
  totalMs: number;
};

/**
 * Converts a duration into stable HH:MM:SS display segments.
 *
 * Hours intentionally exceed 23 for multi-day waits so the display remains a
 * single predictable format instead of changing structure as time passes.
 */
function getRemainingTime(targetTimestamp: number): RemainingTime {
  const totalMs = Math.max(0, targetTimestamp - Date.now());
  const totalSeconds = Math.floor(totalMs / 1000);

  return {
    hours: String(Math.floor(totalSeconds / 3600)).padStart(2, "0"),
    minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0"),
    seconds: String(totalSeconds % 60).padStart(2, "0"),
    totalMs,
  };
}

/**
 * Shows a live, client-side countdown for cooldown user experience.
 *
 * This timer is cosmetic only: gameplay unlock decisions must always be checked
 * again on the server. The expiration callback fires once per target timestamp,
 * and the interval is cleaned up to prevent updates after unmounting.
 */
export function CountdownTimer({
  targetDate,
  onExpire,
  label = "Time remaining",
  className,
}: CountdownTimerProps): React.ReactNode {
  const targetTimestamp = targetDate.getTime();
  const [remaining, setRemaining] = useState<RemainingTime>(() =>
    getRemainingTime(targetTimestamp),
  );
  const hasExpiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    hasExpiredRef.current = false;

    const updateCountdown = (): void => {
      const nextRemaining = getRemainingTime(targetTimestamp);
      setRemaining(nextRemaining);

      if (nextRemaining.totalMs === 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        onExpireRef.current?.();
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [targetTimestamp]);

  return (
    <div
      role="timer"
      aria-label={`${label}: ${remaining.hours} hours, ${remaining.minutes} minutes, ${remaining.seconds} seconds`}
      className={cn("inline-flex items-center gap-1 font-mono tabular-nums", className)}
    >
      {[remaining.hours, remaining.minutes, remaining.seconds].map((segment, index) => (
        <span key={index} className="contents">
          {index > 0 && <span className="text-muted-foreground">:</span>}
          <span className="grid min-w-9 place-items-center rounded-lg bg-muted px-2 py-1 font-semibold text-foreground">
            {segment}
          </span>
        </span>
      ))}
    </div>
  );
}
