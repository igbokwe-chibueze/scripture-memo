"use client";

import { motion } from "framer-motion";
import { SparklesIcon } from "lucide-react";
import { LunaMascot } from "@/components/shared/luna-mascot";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";

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
  const shouldReduceMotion = useReducedMotionPreference();

  return (
    <main
      className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-background px-5 py-8 text-foreground"
      aria-label="Preparing Scripture Memo"
    >
      <div
        className="absolute -top-28 left-1/2 size-96 -translate-x-1/2 rounded-full bg-reward/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 left-1/2 h-80 w-[38rem] max-w-[130vw] -translate-x-1/2 rounded-[50%] bg-primary/5 blur-3xl"
        aria-hidden="true"
      />

      {!shouldReduceMotion &&
        EMBERS.map((ember, index) => (
          <motion.span
            key={`${ember.left}-${ember.top}`}
            className="absolute size-1.5 rounded-full bg-decoration shadow-sm"
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
        <div className="relative mx-auto h-64 w-56 sm:h-72 sm:w-64">
          <motion.div
            className="absolute inset-x-4 bottom-3 h-28 rounded-full bg-reward/10 blur-3xl"
            animate={
              shouldReduceMotion
                ? undefined
                : { scale: [0.9, 1.06, 0.9], opacity: [0.55, 0.9, 0.55] }
            }
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <motion.div
            className="relative h-full"
            animate={shouldReduceMotion ? undefined : { y: [0, -5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <LunaMascot
              pose="loading"
              decorative
              priority
              sizes="(max-width: 640px) 224px, 256px"
              className="h-full w-full"
            />
          </motion.div>
        </div>

        <h1 className="font-heading text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
          Luna is lighting the way
        </h1>

        <div className="mx-auto mt-7 max-w-xs rounded-card border border-border bg-card p-5 shadow-lg">
          <div className="relative flex items-center justify-between" aria-hidden="true">
            <span className="absolute right-3 left-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
            <motion.span
              className="absolute left-3 top-1/2 h-1 origin-left -translate-y-1/2 rounded-full bg-primary"
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
                className="relative z-10 grid size-8 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm"
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
          <p className="mt-4 text-xs font-bold tracking-[0.16em] text-selection-text uppercase dark:text-selection-text">
            Kindling the next moment
          </p>
        </div>

        <span className="sr-only">Loading Scripture Memo with Luna.</span>
      </motion.section>
    </main>
  );
}
