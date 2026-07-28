"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpenIcon, SparklesIcon } from "lucide-react";
import { AnimatedFlame } from "@/features/gameplay/components/animated-flame";

const TRAIL_STEPS = [0, 1, 2, 3, 4] as const;
const EMBERS = [
  { left: "15%", top: "72%", delay: 0.1, duration: 2.8 },
  { left: "27%", top: "84%", delay: 0.8, duration: 3.2 },
  { left: "70%", top: "78%", delay: 0.35, duration: 2.6 },
  { left: "84%", top: "88%", delay: 1.1, duration: 3.4 },
] as const;

/**
 * Turns route suspension into a short game-world transition.
 *
 * The scene follows the active light/dark theme and keeps its status text stable
 * for assistive technology. Reduced-motion preferences freeze decorative motion
 * while preserving the flame, trail, and loading message.
 */
export function GlobalLoading(): React.ReactNode {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <main
      className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-linear-to-b from-amber-50 via-orange-50 to-violet-100 px-5 py-10 text-slate-950 dark:from-slate-950 dark:via-[#150d20] dark:to-[#27123c] dark:text-white"
      aria-label="Preparing Scripture Memo"
    >
      <div
        className="absolute -top-32 left-1/2 size-96 -translate-x-1/2 rounded-full bg-amber-300/30 blur-3xl dark:bg-orange-500/15"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 left-1/2 h-80 w-[38rem] max-w-[130vw] -translate-x-1/2 rounded-[50%] bg-violet-400/25 blur-3xl dark:bg-violet-600/20"
        aria-hidden="true"
      />

      {!shouldReduceMotion &&
        EMBERS.map((ember, index) => (
          <motion.span
            key={`${ember.left}-${ember.top}`}
            className="absolute size-1.5 rounded-full bg-orange-500 shadow-[0_0_12px_rgb(249_115_22/0.8)] dark:bg-amber-300"
            style={{ left: ember.left, top: ember.top }}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.9, 0], y: -90, scale: [0.5, 1, 0.25] }}
            transition={{
              duration: ember.duration,
              delay: ember.delay,
              repeat: Infinity,
              ease: "easeOut",
              repeatDelay: index * 0.15,
            }}
            aria-hidden="true"
          />
        ))}

      <motion.section
        className="relative w-full max-w-md text-center"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.45, ease: "easeOut" }}
        role="status"
        aria-live="polite"
      >
        <div className="relative mx-auto size-36 sm:size-40">
          <motion.div
            className="absolute inset-4 rounded-full border border-orange-400/30 bg-white/55 shadow-[0_0_55px_rgb(249_115_22/0.28)] backdrop-blur-md dark:border-amber-300/20 dark:bg-white/5 dark:shadow-[0_0_65px_rgb(249_115_22/0.22)]"
            animate={
              shouldReduceMotion
                ? undefined
                : { scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }
            }
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.div
            className="absolute inset-0"
            animate={shouldReduceMotion ? undefined : { y: [0, -4, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <AnimatedFlame reducedMotion={shouldReduceMotion} />
          </motion.div>
        </div>

        <p className="mt-2 inline-flex items-center gap-2 text-xs font-black tracking-[0.22em] text-orange-700 uppercase dark:text-amber-300">
          <BookOpenIcon className="size-4" aria-hidden="true" />
          Scripture Memo
        </p>
        <h1 className="mt-3 font-heading text-4xl leading-tight font-black tracking-tight sm:text-5xl">
          Preparing your journey
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 font-semibold text-slate-600 dark:text-slate-300">
          Gathering your verses and lighting the trail ahead.
        </p>

        <div className="mx-auto mt-8 max-w-xs rounded-[1.5rem] border border-white/70 bg-white/65 p-5 shadow-[0_8px_0_rgb(91_33_182/0.15),0_18px_45px_rgb(76_29_149/0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-white/6 dark:shadow-[0_8px_0_rgb(255_255_255/0.08),0_20px_50px_rgb(0_0_0/0.4)]">
          <div className="relative flex items-center justify-between" aria-hidden="true">
            <span className="absolute right-3 left-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-violet-200 dark:bg-white/10" />
            <motion.span
              className="absolute left-3 top-1/2 h-1 origin-left -translate-y-1/2 rounded-full bg-linear-to-r from-orange-400 via-amber-300 to-violet-500"
              initial={{ width: "0%" }}
              animate={{ width: shouldReduceMotion ? "75%" : ["8%", "92%", "8%"] }}
              transition={{
                duration: shouldReduceMotion ? 0 : 2.2,
                repeat: shouldReduceMotion ? 0 : Infinity,
                ease: "easeInOut",
              }}
            />
            {TRAIL_STEPS.map((step) => (
              <motion.span
                key={step}
                className="relative z-10 grid size-8 place-items-center rounded-full border-2 border-white bg-linear-to-br from-orange-400 to-amber-500 text-white shadow-md dark:border-slate-800"
                animate={
                  shouldReduceMotion
                    ? undefined
                    : { y: [0, -3, 0], scale: [1, 1.08, 1] }
                }
                transition={{
                  duration: 0.8,
                  delay: step * 0.16,
                  repeat: Infinity,
                  repeatDelay: 1.1,
                  ease: "easeInOut",
                }}
              >
                <SparklesIcon className="size-3.5" />
              </motion.span>
            ))}
          </div>
          <p className="mt-4 text-xs font-black tracking-[0.16em] text-violet-700 uppercase dark:text-violet-200">
            Kindling the next moment
          </p>
        </div>

        <span className="sr-only">Loading Scripture Memo.</span>
      </motion.section>
    </main>
  );
}
