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
 * The panel deliberately omits Glow Points until the rewards phase implements
 * real ledger-backed awards. Reduced-motion preferences replace movement with
 * an immediate opacity transition through Framer Motion's user preference.
 */
export function ModeCompletionScreen({
  completedMode,
  nextMode,
  isTestReplay,
  onContinue,
  onReplay,
}: {
  completedMode: GameMode;
  nextMode: GameMode | null;
  isTestReplay: boolean;
  onContinue: () => void;
  onReplay?: () => void;
}): React.ReactNode {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-slate-950/85 px-4 py-8 backdrop-blur-md"
      initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mode-complete-title"
    >
      <motion.section
        className="w-full max-w-md overflow-hidden rounded-[2rem] border border-emerald-300/25 bg-linear-to-b from-slate-800 to-slate-950 p-6 text-center text-white shadow-2xl shadow-emerald-950/60 sm:p-8"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 48, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 260, damping: 22, delay: 0.08 }
        }
      >
        <motion.div
          className="relative mx-auto grid size-28 place-items-center rounded-full bg-linear-to-br from-emerald-300 to-emerald-600 text-slate-950 shadow-xl shadow-emerald-500/25"
          initial={shouldReduceMotion ? false : { scale: 0, rotate: -35 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 320, damping: 18, delay: 0.2 }
          }
        >
          <span className="absolute inset-2 rounded-full border border-white/35" />
          <CheckIcon className="size-14 stroke-3" aria-hidden="true" />
        </motion.div>

        <p className="mt-6 text-xs font-black tracking-[0.18em] text-emerald-300 uppercase">
          {isTestReplay ? "Admin test replay" : "Mode restored"}
        </p>
        <h2 id="mode-complete-title" className="mt-2 font-heading text-4xl font-black">
          Beautiful work!
        </h2>
        <p className="mt-3 text-lg font-bold text-slate-200">
          {MODE_LABELS[completedMode]} complete
        </p>

        <div className="mt-7 rounded-2xl border border-amber-300/20 bg-amber-300/8 p-4">
          <SparklesIcon className="mx-auto size-6 text-amber-300" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {isTestReplay
              ? "Testing complete. No progress, rewards, or cooldowns were changed."
              : nextMode
                ? `${MODE_LABELS[nextMode]} is ready when you are.`
                : "Every mode in this challenge day is complete."}
          </p>
        </div>

        <div className="mt-7 grid gap-3">
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
              className="min-h-11 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={onReplay}
            >
              <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
              Replay again
            </Button>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
