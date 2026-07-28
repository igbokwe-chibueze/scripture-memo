"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRightIcon, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedFlame } from "@/features/gameplay/components/animated-flame";
import { useAudioFeedback } from "@/features/gameplay/hooks/use-audio-feedback";

const FLAME_DELAYS_MS = [420, 900, 1_380] as const;
const REWARD_CARD_DELAY_MS = 1_850;
const BALANCE_CARD_DELAY_MS = 2_180;
const CARD_IMPACT_OFFSET_MS = 590;
const CARD_ANIMATION_DURATION_MS = 720;
const BALANCE_COUNT_PAUSE_MS = 500;
const BALANCE_COUNT_DURATION_MS = 900;
const PARTICLE_OFFSETS = [
  { x: -18, y: -18 },
  { x: 18, y: -16 },
  { x: -20, y: 12 },
  { x: 20, y: 13 },
] as const;

/** Counts the total after card impact, then pulses once to confirm settlement. */
function AnimatedBalanceValue({
  startingValue,
  finalValue,
}: {
  startingValue: number;
  finalValue: number;
}): React.ReactNode {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(
    shouldReduceMotion ? finalValue : startingValue,
  );
  const [isComplete, setIsComplete] = useState(Boolean(shouldReduceMotion));
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const delayTimer = window.setTimeout(() => {
      const startedAt = performance.now();
      const animateCount = (now: number): void => {
        const progress = Math.min(
          1,
          (now - startedAt) / BALANCE_COUNT_DURATION_MS,
        );
        const easedProgress = 1 - (1 - progress) ** 3;
        setDisplayValue(
          Math.round(startingValue + (finalValue - startingValue) * easedProgress),
        );
        if (progress < 1) {
          frameRef.current = window.requestAnimationFrame(animateCount);
        } else {
          setIsComplete(true);
        }
      };
      frameRef.current = window.requestAnimationFrame(animateCount);
    }, BALANCE_CARD_DELAY_MS + CARD_ANIMATION_DURATION_MS + BALANCE_COUNT_PAUSE_MS);

    return () => {
      window.clearTimeout(delayTimer);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [finalValue, shouldReduceMotion, startingValue]);

  return (
    <motion.p
      className="mt-1 font-heading text-2xl font-black"
      animate={
        isComplete && !shouldReduceMotion
          ? { scale: [1, 1.3, 1, 1.3, 1, 1.3, 1] }
          : { scale: 1 }
      }
      transition={{ duration: shouldReduceMotion ? 0 : 1.1, ease: "easeOut" }}
    >
      {displayValue.toLocaleString()}
    </motion.p>
  );
}

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
        0,
      ),
    );
    timers.push(
      window.setTimeout(
        () => playAudio("drop"),
        shouldReduceMotion ? 0 : REWARD_CARD_DELAY_MS + CARD_IMPACT_OFFSET_MS,
      ),
      window.setTimeout(
        () => playAudio("drop"),
        shouldReduceMotion ? 0 : BALANCE_CARD_DELAY_MS + CARD_IMPACT_OFFSET_MS,
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
                className="relative grid size-20 transform-gpu place-items-center drop-shadow-lg will-change-transform"
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
                <AnimatedFlame reducedMotion={Boolean(shouldReduceMotion)} />
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

          <div className="mt-4 grid grid-cols-2 gap-3 [perspective:1200px]">
            <motion.div
              className="transform-gpu rounded-2xl bg-orange-100 p-4 will-change-transform dark:bg-orange-400/10"
              style={{ transformStyle: "preserve-3d" }}
              initial={
                shouldReduceMotion
                  ? false
                  : {
                      opacity: 0,
                      z: 260,
                      scale: 1.08,
                      y: -6,
                      rotateX: -13,
                      rotateZ: -7,
                    }
              }
              animate={{
                opacity: [0, 1, 1, 1],
                z: [260, 55, 0, 0],
                scale: [1.08, 1.01, 0.96, 1],
                y: [-6, 3, 13, 0],
                rotateX: [-13, -3, 5, 0],
                rotateZ: [-7, -2, 2, 0],
              }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.72,
                      delay: REWARD_CARD_DELAY_MS / 1_000,
                      times: [0, 0.68, 0.84, 1],
                      ease: ["easeIn", "easeIn", [0.22, 1, 0.36, 1]],
                    }
              }
            >
              <p className="text-xs font-black tracking-wide text-orange-700 uppercase dark:text-orange-300">
                Waypoint rewards
              </p>
              <p className="mt-1 font-heading text-2xl font-black">
                +{waypointRewardTotal.toLocaleString()}
              </p>
            </motion.div>
            <motion.div
              className="transform-gpu rounded-2xl bg-violet-100 p-4 will-change-transform dark:bg-violet-400/10"
              style={{ transformStyle: "preserve-3d" }}
              initial={
                shouldReduceMotion
                  ? false
                  : {
                      opacity: 0,
                      z: 260,
                      scale: 1.08,
                      y: -6,
                      rotateX: -13,
                      rotateZ: 7,
                    }
              }
              animate={{
                opacity: [0, 1, 1, 1],
                z: [260, 55, 0, 0],
                scale: [1.08, 1.01, 0.96, 1],
                y: [-6, 3, 13, 0],
                rotateX: [-13, -3, 5, 0],
                rotateZ: [7, 2, -2, 0],
              }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      duration: 0.72,
                      delay: BALANCE_CARD_DELAY_MS / 1_000,
                      times: [0, 0.68, 0.84, 1],
                      ease: ["easeIn", "easeIn", [0.22, 1, 0.36, 1]],
                    }
              }
            >
              <p className="text-xs font-black tracking-wide text-violet-700 uppercase dark:text-violet-300">
                Total balance
              </p>
              <AnimatedBalanceValue
                startingValue={waypointRewardTotal}
                finalValue={totalBalance}
              />
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
