"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightIcon,
  FlameIcon,
  SparklesIcon,
} from "lucide-react";
import { ShareAchievementButton } from "@/components/shared/share-achievement-button";
import { Button } from "@/components/ui/button";
import { AnimatedFlame } from "@/features/gameplay/components/animated-flame";
import { useFlameAmbience } from "@/features/gameplay/hooks/use-flame-ambience";
import { useAudioFeedback } from "@/features/gameplay/hooks/use-audio-feedback";
import type { StreakCompletionResult } from "@/features/gameplay/types/game-session.types";

/** Dedicated, learner-controlled celebration for a changed daily streak. */
export function StreakCompletionScreen({
  streak,
  onContinue,
}: {
  streak: StreakCompletionResult;
  onContinue: () => void;
}): React.ReactNode {
  const shouldReduceMotion = useReducedMotion();
  const playAudio = useAudioFeedback();
  const [ambienceStarted, setAmbienceStarted] = useState(false);
  useFlameAmbience(ambienceStarted);
  const shareText = `I reached a ${streak.currentStreak}-day ${streak.levelName} streak in Scripture Memo! 🔥`;

  useEffect(() => {
    playAudio("correct");
    // The longest success treatment lasts roughly 1.25 seconds. Waiting until
    // it resolves keeps the flame bed from masking the celebratory opening.
    const ambienceTimer = window.setTimeout(
      () => setAmbienceStarted(true),
      1_300,
    );
    return () => window.clearTimeout(ambienceTimer);
  }, [playAudio]);

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
      className="fixed inset-0 z-40 overflow-y-auto bg-orange-950/75 px-4 backdrop-blur-md"
      initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-complete-title"
    >
      <div className="flex min-h-full w-full justify-center py-4 sm:py-8">
        <motion.section
          className="relative my-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-orange-300/45 bg-linear-to-b from-amber-50 via-orange-50 to-white p-6 text-center text-slate-950 shadow-2xl shadow-orange-950/45 dark:from-orange-950 dark:via-slate-900 dark:to-slate-950 dark:text-white sm:p-8"
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.74, y: 44 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  type: "spring",
                  stiffness: streak.reachedNewLevel ? 180 : 210,
                  damping: streak.reachedNewLevel ? 14 : 16,
                  mass: streak.reachedNewLevel ? 1.15 : 1,
                }
          }
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-orange-300/30 to-transparent" />
          <motion.div
            className="relative mx-auto size-40"
            initial={shouldReduceMotion ? false : { scale: 0.45, rotate: -8 }}
            animate={
              streak.reachedNewLevel && !shouldReduceMotion
                ? {
                    scale: [0.45, 1.22, 0.94, 1.08, 1],
                    rotate: [-8, 4, -2, 1, 0],
                  }
                : { scale: 1, rotate: 0 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : streak.reachedNewLevel
                  ? {
                      duration: 0.82,
                      delay: 0.15,
                      times: [0, 0.34, 0.58, 0.78, 1],
                      ease: "easeOut",
                    }
                  : {
                      type: "spring",
                      stiffness: 220,
                      damping: 15,
                      delay: 0.15,
                    }
            }
          >
            {streak.reachedNewLevel && !shouldReduceMotion && (
              <>
                {[0, 1, 2].map((ring) => (
                  <motion.span
                    key={ring}
                    className="absolute inset-4 rounded-full border-2 border-orange-400/70"
                    initial={{ opacity: 0.8, scale: 0.6 }}
                    animate={{ opacity: 0, scale: 1.65 }}
                    transition={{
                      duration: 0.8,
                      delay: 0.28 + ring * 0.16,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </>
            )}
            <AnimatedFlame reducedMotion={Boolean(shouldReduceMotion)} />
          </motion.div>

          <p className="relative mt-3 text-xs font-black tracking-[0.2em] text-orange-700 uppercase dark:text-orange-300">
            {streak.reachedNewLevel
              ? "New streak level reached"
              : streak.status === "reset"
                ? "A fresh rhythm begins"
                : "Daily rhythm kindled"}
          </p>
          <h2 id="streak-complete-title" className="relative mt-2 font-heading text-5xl font-black">
            {streak.currentStreak}-day streak!
          </h2>
          <p className="relative mt-3 text-lg font-bold text-slate-700 dark:text-slate-200">
            {streak.status === "increased"
              ? "You returned and kept the flame alive."
              : "Today begins a new rhythm in Scripture."}
          </p>

          <motion.div
            className="relative mx-auto mt-5 w-fit rounded-full border border-orange-400/40 bg-orange-500 px-5 py-2 font-heading text-lg font-black text-white shadow-lg shadow-orange-500/25"
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.65, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    type: "spring",
                    stiffness: streak.reachedNewLevel ? 360 : 240,
                    damping: 16,
                    delay: 0.38,
                  }
            }
          >
            {streak.levelName}
          </motion.div>

          <div className="relative mt-6 rounded-2xl border border-orange-300/35 bg-white/65 p-3 dark:bg-white/5">
            <p className="text-xs font-black tracking-[0.12em] text-orange-700 uppercase dark:text-orange-300">
              Next streak level
            </p>
            {streak.nextLevel ? (
              <>
                <p className="mt-2 font-heading text-xl font-black">
                  {streak.nextLevel.name}
                </p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground dark:text-slate-300">
                  {streak.nextLevel.daysRemaining}{" "}
                  {streak.nextLevel.daysRemaining === 1 ? "day" : "days"} remaining
                  {" · "}
                  {streak.nextLevel.projectedDateLabel}
                </p>
              </>
            ) : (
              <p className="mt-2 font-heading text-xl font-black">
                Highest streak level reached
              </p>
            )}
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {streak.forecast.map((day) => (
                <div key={day.dateKey} className="text-center">
                  <div
                    className={`mx-auto grid size-9 place-items-center text-xs font-black ${
                      day.state === "today"
                        ? ""
                        : day.state === "milestone"
                          ? "text-orange-600 dark:text-orange-300"
                          : "rounded-full border border-dashed border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-400/8 dark:text-orange-200"
                    }`}
                    title={
                      day.state === "today"
                        ? `Current ${day.streakDays}-day streak`
                        : day.state === "milestone"
                          ? `${streak.nextLevel?.name ?? "Next level"} can be reached`
                          : `Potential ${day.streakDays}-day streak`
                    }
                  >
                    {day.state === "today"
                      ? (
                          <span className="block size-9">
                            <AnimatedFlame reducedMotion />
                          </span>
                        )
                      : day.state === "milestone"
                        ? (
                            <FlameIcon
                              className="size-7 fill-current"
                              aria-hidden="true"
                            />
                          )
                        : day.streakDays}
                  </div>
                  <p className="mt-1 text-[0.65rem] font-bold text-muted-foreground dark:text-slate-300">
                    {day.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-orange-800/75 dark:text-orange-100/75">
              {streak.nextLevel
                ? `Keep your streak alive to reach ${streak.nextLevel.name}.`
                : "Keep the Eternal Light burning one day at a time."}
            </p>
          </div>

          {(streak.isNewBest || streak.status === "reset") && (
            <motion.div
              className="relative mt-6 rounded-2xl border border-amber-400/45 bg-amber-100/80 p-4 dark:bg-amber-300/10"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: shouldReduceMotion ? 0 : 0.42 }}
            >
              <SparklesIcon className="mx-auto size-6 text-amber-600 dark:text-amber-300" aria-hidden="true" />
              <p className="mt-2 font-black text-amber-800 dark:text-amber-200">
                {streak.status === "reset"
                  ? `Previous best: ${streak.previousBestStreak} days`
                  : "New personal best"}
              </p>
              {streak.status === "reset" && (
                <p className="mt-1 text-sm font-semibold text-amber-900/70 dark:text-amber-100/70">
                  Today begins a new flame.
                </p>
              )}
            </motion.div>
          )}

          <div className="relative mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <Button
              type="button"
              className="min-h-12 rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400"
              onClick={onContinue}
            >
              Continue
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
            <ShareAchievementButton
              title="My Scripture Memo streak"
              text={shareText}
              className="border-orange-300/60 bg-white/60 hover:bg-orange-100 dark:bg-white/5 dark:hover:bg-white/10"
            />
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
