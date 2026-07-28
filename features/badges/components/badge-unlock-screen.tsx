"use client";

import { useEffect } from "react";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ConfettiCelebration } from "@/features/gameplay/components/confetti-celebration";
import { useAudioFeedback } from "@/features/gameplay/hooks/use-audio-feedback";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import { cn } from "@/lib/utils";

const RARITY_STYLES = {
  COMMON: "from-slate-100 to-slate-200 text-slate-700 dark:from-slate-700 dark:to-slate-900 dark:text-slate-100",
  UNCOMMON: "from-emerald-100 to-emerald-200 text-emerald-800 dark:from-emerald-800 dark:to-emerald-950 dark:text-emerald-100",
  RARE: "from-sky-100 to-blue-200 text-blue-800 dark:from-sky-800 dark:to-blue-950 dark:text-sky-100",
  EPIC: "from-violet-100 to-fuchsia-200 text-violet-800 dark:from-violet-800 dark:to-fuchsia-950 dark:text-violet-100",
  LEGENDARY: "from-amber-100 via-yellow-200 to-orange-200 text-amber-900 dark:from-amber-700 dark:via-orange-800 dark:to-amber-950 dark:text-amber-50",
} as const;

/** Presents one persisted badge unlock and waits for explicit player dismissal. */
export function BadgeUnlockScreen({
  badge,
  onContinue,
}: {
  badge: BadgeUnlockResult;
  onContinue: () => void;
}): React.ReactNode {
  const shouldReduceMotion = useReducedMotion();
  const playAudio = useAudioFeedback();

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    playAudio("badge-unlock");
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [playAudio]);

  const isLegendary = badge.rarity === "LEGENDARY";

  return (
    <>
      <ConfettiCelebration show />
      <motion.div
        className="fixed inset-0 z-60 overflow-y-auto bg-slate-950/70 px-4 backdrop-blur-md"
        initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-unlock-title"
      >
        <div className="flex min-h-full justify-center py-4 sm:py-8">
          <motion.section
            className={cn(
              "relative my-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-white/50 bg-linear-to-br p-6 text-center shadow-2xl sm:p-9",
              RARITY_STYLES[badge.rarity],
            )}
            initial={
              shouldReduceMotion
                ? false
                : { opacity: 0, scale: isLegendary ? 0.72 : 0.84, rotate: -5 }
            }
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0 : isLegendary ? 0.75 : 0.48,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <SparklesIcon className="absolute top-6 left-6 size-5 opacity-60" aria-hidden="true" />
            <SparklesIcon className="absolute top-10 right-7 size-4 opacity-50" aria-hidden="true" />
            <motion.div
              className="mx-auto grid size-28 place-items-center rounded-full border border-white/60 bg-white/55 text-6xl shadow-xl backdrop-blur-sm dark:bg-black/20"
              animate={
                shouldReduceMotion
                  ? undefined
                  : { scale: isLegendary ? [1, 1.1, 1] : [1, 1.05, 1] }
              }
              transition={{ duration: 1.3, repeat: isLegendary ? 2 : 0 }}
              aria-hidden="true"
            >
              {badge.icon ?? "🏅"}
            </motion.div>

            <p className="mt-6 text-xs font-black tracking-[0.2em] uppercase">
              Badge unlocked
            </p>
            <h2 id="badge-unlock-title" className="mt-2 font-heading text-4xl font-black">
              {badge.name}
            </h2>
            <p className="mt-3 text-sm font-bold opacity-75">{badge.description}</p>
            <span className="mt-5 inline-flex rounded-full border border-current/20 bg-white/35 px-4 py-2 text-xs font-black tracking-[0.16em] uppercase dark:bg-black/15">
              {badge.rarity}
            </span>

            <div className="mt-6 rounded-2xl border border-current/15 bg-white/45 p-4 dark:bg-black/15">
              <p className="text-xs font-black tracking-[0.14em] uppercase">
                Glow Points earned
              </p>
              <p className="mt-1 font-heading text-3xl font-black">+{badge.rewardAmount}</p>
              <p className="text-xs font-bold opacity-70">New balance: {badge.balance}</p>
            </div>

            <Button
              type="button"
              className="mt-6 min-h-12 w-full rounded-xl bg-slate-950 font-black text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              onClick={onContinue}
            >
              Continue
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
          </motion.section>
        </div>
      </motion.div>
    </>
  );
}

/** Displays multiple simultaneous unlocks one at a time without losing any. */
export function BadgeUnlockSequence({
  badges,
  index,
  onAdvance,
}: {
  badges: BadgeUnlockResult[];
  index: number;
  onAdvance: () => void;
}): React.ReactNode {
  const badge = badges[index];
  return badge ? <BadgeUnlockScreen badge={badge} onContinue={onAdvance} /> : null;
}
