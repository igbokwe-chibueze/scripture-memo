"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, FlameIcon, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAudioFeedback } from "@/features/gameplay/hooks/use-audio-feedback";

const FLAME_DELAYS_MS = [420, 900, 1_380] as const;
const PARTICLE_OFFSETS = [
  { x: -18, y: -18 },
  { x: 18, y: -16 },
  { x: -20, y: 12 },
  { x: 20, y: 13 },
] as const;

/** Dedicated milestone celebration shown only after Radiance completes a waypoint. */
export function WaypointCompletionScreen({
  waypointNumber,
  verseReference,
  unlockedWaypointNumber,
  caughtUp,
  waypointRewardTotal,
  totalBalance,
  onContinue,
}: {
  waypointNumber: number;
  verseReference: string;
  unlockedWaypointNumber: number | null;
  caughtUp: boolean;
  waypointRewardTotal: number;
  totalBalance: number;
  onContinue: () => void;
}): React.ReactNode {
  const shouldReduceMotion = useReducedMotion();
  const playAudio = useAudioFeedback();

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

  useEffect(() => {
    const timers = FLAME_DELAYS_MS.map((delay) =>
      window.setTimeout(() => playAudio("drop"), shouldReduceMotion ? 0 : delay),
    );
    timers.push(
      window.setTimeout(
        () => playAudio("waypoint-complete"),
        shouldReduceMotion ? 0 : 1_700,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [playAudio, shouldReduceMotion]);

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
                className="relative grid size-20 transform-gpu place-items-center rounded-full bg-linear-to-br from-amber-300 to-orange-600 text-white shadow-lg shadow-orange-500/20 will-change-transform"
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.55, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : {
                        duration: 0.28,
                        delay: FLAME_DELAYS_MS[flame]! / 1_000,
                        ease: [0.22, 1, 0.36, 1],
                      }
                }
              >
                {!shouldReduceMotion &&
                  PARTICLE_OFFSETS.map((offset, particle) => (
                    <motion.i
                      key={particle}
                      className="pointer-events-none absolute size-2 rounded-full bg-amber-300"
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0.4],
                        x: offset.x,
                        y: offset.y,
                      }}
                      transition={{
                        duration: 0.42,
                        delay: FLAME_DELAYS_MS[flame]! / 1_000 + 0.08,
                        ease: "easeOut",
                      }}
                    />
                  ))}
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

          <div className="mt-4 grid grid-cols-2 gap-3">
            <motion.div
              className="transform-gpu rounded-2xl bg-orange-100 p-4 will-change-transform dark:bg-orange-400/10"
              initial={shouldReduceMotion ? false : { opacity: 0, y: -72, rotate: -2 }}
              animate={{ opacity: 1, y: [-72, 7, 0], rotate: [-2, 1, 0] }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.48, delay: 1.85, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <p className="text-xs font-black tracking-wide text-orange-700 uppercase dark:text-orange-300">
                Waypoint rewards
              </p>
              <p className="mt-1 font-heading text-2xl font-black">+{waypointRewardTotal}</p>
            </motion.div>
            <motion.div
              className="transform-gpu rounded-2xl bg-violet-100 p-4 will-change-transform dark:bg-violet-400/10"
              initial={shouldReduceMotion ? false : { opacity: 0, y: -72, rotate: 2 }}
              animate={{ opacity: 1, y: [-72, 7, 0], rotate: [2, -1, 0] }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 0.48, delay: 2.15, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <p className="text-xs font-black tracking-wide text-violet-700 uppercase dark:text-violet-300">
                Total balance
              </p>
              <p className="mt-1 font-heading text-2xl font-black">{totalBalance}</p>
            </motion.div>
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
