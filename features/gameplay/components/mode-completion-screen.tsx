"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightIcon,
  CheckIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameMode } from "@/lib/generated/prisma/enums";
import type { DayRewardResult } from "@/features/rewards/types/reward.types";

const MODE_LABELS = {
  DRAG_DROP: "Drag & Drop",
  PUZZLE: "Puzzle",
  SWAP: "Swap",
  CUE: "Cue",
  FILL: "Fill",
} as const;

/**
 * Pauses progression on a celebratory, explicit learner-controlled transition.
 *
 * Glow Points render only from the persisted reward returned by the atomic
 * completion transaction. Reduced-motion preferences replace movement with an
 * immediate opacity transition through Framer Motion's user preference.
 */
export function ModeCompletionScreen({
  completedMode,
  nextMode,
  isTestReplay,
  onContinue,
  onReplay,
  reward = null,
}: {
  completedMode: GameMode;
  nextMode: GameMode | null;
  isTestReplay: boolean;
  onContinue: () => void;
  onReplay?: () => void;
  reward?: DayRewardResult | null;
}): React.ReactNode {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/65 px-4 backdrop-blur-md dark:bg-slate-950/85"
      initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-complete-title"
    >
      {/*
       * WHY: `my-auto` safely centers a short card but resolves to zero when the
       * card is taller than the viewport. The surrounding vertical padding then
       * keeps its top reachable, unlike unsafe grid centering which clipped the
       * beginning of oversized mobile dialogs above the scroll origin.
       */}
      <div className="flex min-h-full w-full justify-center py-4 sm:py-8">
        <motion.section
          className="my-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-emerald-500/25 bg-linear-to-b from-white to-emerald-50 p-5 text-center text-foreground shadow-2xl shadow-emerald-950/25 dark:border-emerald-300/25 dark:from-slate-800 dark:to-slate-950 dark:text-white dark:shadow-emerald-950/60 sm:p-8"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 48, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 260, damping: 22, delay: 0.08 }
          }
        >
          <motion.div
            className="relative mx-auto grid size-24 place-items-center rounded-full bg-linear-to-br from-emerald-300 to-emerald-600 text-slate-950 shadow-xl shadow-emerald-500/25 sm:size-28"
            initial={shouldReduceMotion ? false : { scale: 0, rotate: -35 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 320, damping: 18, delay: 0.2 }
            }
          >
            <span className="absolute inset-2 rounded-full border border-white/35" />
            <CheckIcon className="size-12 stroke-3 sm:size-14" aria-hidden="true" />
          </motion.div>

          <p className="mt-5 text-xs font-black tracking-[0.18em] text-emerald-700 uppercase dark:text-emerald-300 sm:mt-6">
            {isTestReplay ? "Admin test replay" : "Mode restored"}
          </p>
          <h2 id="mode-complete-title" className="mt-2 font-heading text-4xl font-black">
            Beautiful work!
          </h2>
          <p className="mt-3 text-lg font-bold text-foreground/80 dark:text-slate-200">
            {MODE_LABELS[completedMode]} complete
          </p>

          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-100/70 p-4 dark:border-amber-300/20 dark:bg-amber-300/8 sm:mt-7">
            <SparklesIcon className="mx-auto size-6 text-amber-600 dark:text-amber-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-muted-foreground dark:text-slate-300">
              {isTestReplay
                ? "Testing complete. No progress, rewards, or cooldowns were changed."
                : nextMode
                  ? `${MODE_LABELS[nextMode]} is ready when you are.`
                  : "Every mode in this challenge day is complete."}
            </p>
            {!isTestReplay && reward && (
              <div className="mt-3">
                <p className="text-xs font-black tracking-[0.14em] text-amber-700 uppercase dark:text-amber-300">
                  Glow Points earned
                </p>
                <p className="font-heading text-3xl font-black text-amber-700 dark:text-amber-300">
                  +{reward.amount}
                </p>
                <p className="text-xs font-semibold text-muted-foreground dark:text-slate-300">
                  New balance: {reward.balance}
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:mt-7">
            <Button
              type="button"
              className="min-h-12 rounded-xl bg-emerald-400 font-black text-slate-950 hover:bg-emerald-300"
              onClick={onContinue}
            >
              {isTestReplay ? "Return to current mode" : nextMode ? `Continue to ${MODE_LABELS[nextMode]}` : "Continue"}
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
            {isTestReplay && onReplay && (
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={onReplay}
              >
                <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
                Replay again
              </Button>
            )}
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
