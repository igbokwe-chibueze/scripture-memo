"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, FlameIcon, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Dedicated milestone celebration shown only after Radiance completes a waypoint. */
export function WaypointCompletionScreen({
  waypointNumber,
  verseReference,
  unlockedWaypointNumber,
  caughtUp,
  onContinue,
}: {
  waypointNumber: number;
  verseReference: string;
  unlockedWaypointNumber: number | null;
  caughtUp: boolean;
  onContinue: () => void;
}): React.ReactNode {
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/75 px-4 backdrop-blur-md"
      initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="waypoint-complete-title"
    >
      <div className="flex min-h-full w-full justify-center py-4 sm:py-8">
        <motion.section
          className="my-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-orange-300/35 bg-linear-to-b from-amber-50 via-white to-orange-50 p-6 text-center text-slate-950 shadow-2xl shadow-orange-950/35 dark:from-slate-800 dark:via-slate-900 dark:to-orange-950 dark:text-white sm:p-8"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 240, damping: 20 }
          }
        >
          <div className="flex justify-center gap-3" aria-label="Three flames kindled">
            {[0, 1, 2].map((flame) => (
              <motion.span
                key={flame}
                className="grid size-20 place-items-center rounded-full bg-linear-to-br from-amber-300 to-orange-600 text-white shadow-xl shadow-orange-500/25"
                initial={shouldReduceMotion ? false : { scale: 0, y: 18 }}
                animate={{ scale: 1, y: 0 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", delay: 0.12 + flame * 0.12 }
                }
              >
                <FlameIcon className="size-10 fill-current" aria-hidden="true" />
              </motion.span>
            ))}
          </div>

          <p className="mt-6 text-xs font-black tracking-[0.18em] text-orange-700 uppercase dark:text-orange-300">
            Three flames kindled
          </p>
          <h2 id="waypoint-complete-title" className="mt-2 font-heading text-4xl font-black">
            Waypoint {waypointNumber} complete!
          </h2>
          <p className="mt-3 text-lg font-bold text-foreground/75 dark:text-slate-200">
            {verseReference}
          </p>

          <div className="mt-6 rounded-2xl border border-amber-400/35 bg-amber-100/75 p-5 dark:bg-amber-300/10">
            <MapIcon className="mx-auto size-7 text-orange-600 dark:text-orange-300" aria-hidden="true" />
            <p className="mt-2 font-bold">
              {unlockedWaypointNumber
                ? `Waypoint ${unlockedWaypointNumber} is now unlocked.`
                : caughtUp
                  ? "You are caught up with the trail."
                  : "Your trail progress has been saved."}
            </p>
          </div>

          <Button
            type="button"
            className="mt-7 min-h-12 w-full rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400"
            onClick={onContinue}
          >
            Continue to trail
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </motion.section>
      </div>
    </motion.div>
  );
}
