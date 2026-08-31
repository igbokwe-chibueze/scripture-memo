"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";
import { LunaMascot } from "@/components/shared/luna-mascot";
import { Button } from "@/components/ui/button";
import type { GameMode } from "@/lib/generated/prisma/enums";
import type { DayRewardResult } from "@/features/rewards/types/reward.types";
import type { BeaconProgressionResult } from "@/features/beacon/types/beacon.types";

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
  isAdminTest = false,
  isVaultReplay = false,
  onContinue,
  onReplay,
  reward = null,
  beaconProgression = null,
}: {
  completedMode: GameMode;
  nextMode: GameMode | null;
  isTestReplay: boolean;
  isAdminTest?: boolean;
  isVaultReplay?: boolean;
  onContinue: () => void;
  onReplay?: () => void;
  reward?: DayRewardResult | null;
  beaconProgression?: BeaconProgressionResult | null;
}): React.ReactNode {
  const t = useTranslations("Completion");
  const gameT = useTranslations("Gameplay");
  const modeLabels: Record<GameMode, string> = {
    DRAG_DROP: gameT("dragDrop"), PUZZLE: gameT("puzzle"), SWAP: gameT("swap"), CUE: gameT("cue"), FILL: gameT("fill"),
  };
  const shouldReduceMotion = useReducedMotion();
  const levelProgress = beaconProgression
    ? Math.min(
        100,
        Math.max(
          0,
          ((beaconProgression.lifetimeXp -
            beaconProgression.currentLevelStartXp) /
            (beaconProgression.nextLevelXp -
              beaconProgression.currentLevelStartXp)) *
            100,
        ),
      )
    : 0;

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    // WHY: The fixed completion surface owns scrolling while it is visible.
    // Locking both scrolling roots prevents the obscured gameplay page from
    // moving and removes the confusing second scrollbar without clipping a
    // completion card that is taller than a small mobile viewport.
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, []);

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
          initial={shouldReduceMotion ? false : { opacity: 0, y: 46, scale: 0.78 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: 210,
                  damping: 16,
                  mass: 1,
                  delay: 0.08,
                }
          }
        >
          <motion.div
            className="relative mx-auto flex h-36 w-36 items-end justify-center sm:h-44 sm:w-44"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.55, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 320, damping: 18, delay: 0.2 }
            }
          >
            <LunaMascot
              pose="celebrate"
              decorative
              className="max-h-full w-auto"
              sizes="176px"
            />
          </motion.div>

          <p className="mt-2 text-xs font-black tracking-[0.18em] text-emerald-700 uppercase dark:text-emerald-300 sm:mt-3">
            {isAdminTest
              ? t("adminTest")
              : isTestReplay
                ? t("adminReplay")
              : isVaultReplay
                ? t("vaultReplay")
                : t("modeRestored")}
          </p>
          <h2 id="mode-complete-title" className="mt-2 font-heading text-4xl font-black">
            {t("beautifulWork")}
          </h2>
          <p className="mt-3 text-lg font-bold text-foreground/80 dark:text-slate-200">
            {t("modeComplete", { mode: modeLabels[completedMode] })}
          </p>

          <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-100/70 p-4 dark:border-amber-300/20 dark:bg-amber-300/8 sm:mt-7">
            <SparklesIcon className="mx-auto size-6 text-amber-600 dark:text-amber-300" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-muted-foreground dark:text-slate-300">
              {isTestReplay || isAdminTest
                ? t("testingComplete")
                : isVaultReplay
                  ? nextMode
                    ? t("vaultNextReady", { mode: modeLabels[nextMode] })
                    : t("vaultComplete")
                : nextMode
                  ? t("nextReady", { mode: modeLabels[nextMode] })
                  : t("dayComplete")}
            </p>
            {!isTestReplay && reward && (
              <div className="mt-3">
                <p className="text-xs font-black tracking-[0.14em] text-amber-700 uppercase dark:text-amber-300">
                  {t("glowEarned")}
                </p>
                <p className="font-heading text-3xl font-black text-amber-700 dark:text-amber-300">
                  +{reward.amount}
                </p>
                <p className="text-xs font-semibold text-muted-foreground dark:text-slate-300">
                  {t("newBalance", { balance: reward.balance })}
                </p>
              </div>
            )}
          </div>

          {beaconProgression && !isTestReplay && !isAdminTest && !isVaultReplay && (
            <motion.div
              className="mt-4 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-left"
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: shouldReduceMotion ? 0 : 0.42 }}
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-black tracking-[0.14em] text-violet-700 uppercase dark:text-violet-300">
                    {t("beaconXpEarned", { count: beaconProgression.earnedXp })}
                  </p>
                  <p className="mt-1 font-heading text-lg font-black">
                    {t("beaconLevel", { level: beaconProgression.level })}
                  </p>
                </div>
                <span className="font-heading text-2xl font-black text-violet-700 dark:text-violet-300">
                  +{beaconProgression.earnedXp}
                </span>
              </div>
              <div
                className="mt-3 h-3 overflow-hidden rounded-full bg-violet-950/15 dark:bg-black/35"
                role="progressbar"
                aria-label={t("beaconLevelProgress")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(levelProgress)}
              >
                <motion.div
                  className="h-full rounded-full bg-linear-to-r from-violet-500 to-fuchsia-400"
                  initial={{ width: shouldReduceMotion ? `${levelProgress}%` : 0 }}
                  animate={{ width: `${levelProgress}%` }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.8, delay: 0.5 }}
                />
              </div>
              {beaconProgression.leveledUp && (
                <motion.p
                  className="mt-3 text-center font-heading text-lg font-black text-fuchsia-700 dark:text-fuchsia-300"
                  initial={shouldReduceMotion ? false : { scale: 0.7 }}
                  animate={{ scale: [1, 1.14, 1] }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.7, delay: 1.1 }}
                >
                  {t("levelUp", { level: beaconProgression.level })}
                </motion.p>
              )}
            </motion.div>
          )}

          <div className="mt-5 grid gap-3 sm:mt-7">
            <Button
              type="button"
              className="min-h-12 rounded-xl bg-emerald-400 font-black text-slate-950 hover:bg-emerald-300"
              onClick={onContinue}
            >
              {isTestReplay
                ? t("returnCurrent")
                : isAdminTest
                  ? t("returnWaypoints")
                : nextMode
                  ? t("continueTo", { mode: modeLabels[nextMode] })
                  : isVaultReplay
                    ? t("returnVault")
                    : t("continueJourney")}
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
