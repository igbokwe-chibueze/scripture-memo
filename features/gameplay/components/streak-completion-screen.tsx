"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";
import {
  ArrowRightIcon,
  FlameIcon,
  SparklesIcon,
} from "lucide-react";
import { ShareAchievementButton } from "@/components/shared/share-achievement-button";
import { Button } from "@/components/ui/button";
import { AnimatedFlame } from "@/features/gameplay/components/animated-flame";
import { useFlameAmbience } from "@/features/gameplay/hooks/use-flame-ambience";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import type { StreakCompletionResult } from "@/features/gameplay/types/game-session.types";

/** Dedicated, learner-controlled celebration for a changed daily streak. */
export function StreakCompletionScreen({
  streak,
  onContinue,
}: {
  streak: StreakCompletionResult;
  onContinue: () => void;
}): React.ReactNode {
  const t = useTranslations("Streak");
  const commonT = useTranslations("Common");
  const locale = useLocale();
  const shouldReduceMotion = useReducedMotionPreference();
  const playAudio = useAudioFeedback();
  const [ambienceStarted, setAmbienceStarted] = useState(false);
  useFlameAmbience(ambienceStarted);
  const levelKey = ({ Spark: "spark", Kindling: "kindling", "Steady Flame": "steadyFlame", Beacon: "beacon", Blaze: "blaze", Inferno: "inferno", Supernova: "supernova", "Eternal Light": "eternalLightLevel" } as const)[streak.levelName as "Spark" | "Kindling" | "Steady Flame" | "Beacon" | "Blaze" | "Inferno" | "Supernova" | "Eternal Light"];
  const levelName = levelKey ? t(levelKey) : streak.levelName;
  const nextLevelKey = streak.nextLevel ? ({ Spark: "spark", Kindling: "kindling", "Steady Flame": "steadyFlame", Beacon: "beacon", Blaze: "blaze", Inferno: "inferno", Supernova: "supernova", "Eternal Light": "eternalLightLevel" } as const)[streak.nextLevel.name as "Spark" | "Kindling" | "Steady Flame" | "Beacon" | "Blaze" | "Inferno" | "Supernova" | "Eternal Light"] : null;
  const nextLevelName = nextLevelKey ? t(nextLevelKey) : streak.nextLevel?.name;
  const shareText = t("shareText", { count: streak.currentStreak, level: levelName });

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
      className="fixed inset-0 z-40 overflow-y-auto bg-overlay px-4 backdrop-blur-md"
      initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-complete-title"
    >
      <div className="flex min-h-full w-full justify-center py-4 sm:py-8">
        <motion.section
          className="relative my-auto w-full max-w-md overflow-hidden rounded-dialog border border-border bg-card p-6 text-center text-foreground shadow-2xl sm:p-8"
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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-linear-to-b from-decoration/10 to-transparent" />
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
                    className="absolute inset-4 rounded-full border-2 border-decoration-border/70"
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

          <p className="relative mt-3 text-xs font-bold tracking-[0.2em] text-decoration-text uppercase dark:text-decoration-text">
            {streak.reachedNewLevel
              ? t("newLevel")
              : streak.status === "reset"
                ? t("freshRhythm")
                : t("dailyRhythm")}
          </p>
          <h2 id="streak-complete-title" className="relative mt-2 font-heading text-5xl font-bold">
            {t("dayStreak", { count: streak.currentStreak })}
          </h2>
          <p className="relative mt-3 text-lg font-bold text-foreground dark:text-foreground">
            {streak.status === "increased"
              ? t("keptAlive")
              : t("newRhythm")}
          </p>

          <motion.div
            className="relative mx-auto mt-5 w-fit rounded-full border border-decoration-border bg-decoration-subtle px-5 py-2 font-heading text-lg font-bold text-decoration-text"
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
            {levelName}
          </motion.div>

          <div className="relative mt-6 rounded-card border border-border bg-muted p-3">
            <p className="text-xs font-bold tracking-[0.12em] text-decoration-text uppercase dark:text-decoration-text">
              {t("nextStreakLevel")}
            </p>
            {streak.nextLevel ? (
              <>
                <p className="mt-2 font-heading text-xl font-bold">
                  {nextLevelName}
                </p>
                <p className="mt-1 text-sm font-medium text-muted-foreground dark:text-foreground">
                  {t("daysRemaining", { count: streak.nextLevel.daysRemaining })}
                  {" · "}
                  {new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(`${streak.nextLevel.projectedDateKey}T12:00:00Z`))}
                </p>
              </>
            ) : (
              <p className="mt-2 font-heading text-xl font-bold">
                {t("highestReached")}
              </p>
            )}
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {streak.forecast.map((day) => (
                <div key={day.dateKey} className="text-center">
                  <div
                    className={`mx-auto grid size-9 place-items-center text-xs font-bold ${
                      day.state === "today"
                        ? ""
                        : day.state === "milestone"
                          ? "text-decoration-text"
                          : "rounded-full border border-dashed border-decoration-border bg-decoration-subtle text-decoration-text"
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
                  <p className="mt-1 text-[0.65rem] font-bold text-muted-foreground dark:text-foreground">
                    {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(`${day.dateKey}T12:00:00Z`))}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              {streak.nextLevel
                ? t("nextLevel", { level: nextLevelName ?? "" })
                : t("eternalLight")}
            </p>
          </div>

          {(streak.isNewBest || streak.status === "reset") && (
            <motion.div
              className="relative mt-6 rounded-card border border-reward-border bg-reward-subtle p-4"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: shouldReduceMotion ? 0 : 0.42 }}
            >
              <SparklesIcon className="mx-auto size-6 text-reward-text dark:text-reward-text" aria-hidden="true" />
              <p className="mt-2 font-bold text-reward-text dark:text-reward-text">
                {streak.status === "reset"
                  ? t("previousBest", { count: streak.previousBestStreak })
                  : t("personalBest")}
              </p>
              {streak.status === "reset" && (
                <p className="mt-1 text-sm font-medium text-reward-text/70 dark:text-reward-text/70">
                  {t("newFlame")}
                </p>
              )}
            </motion.div>
          )}

          <div className="relative mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
            <Button
              type="button"
              className="min-h-12 rounded-game-action font-bold"
              onClick={onContinue}
            >
              {commonT("continue")}
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Button>
            <ShareAchievementButton
              title={t("shareTitle")}
              text={shareText}
              className="border-decoration-border/60 bg-card/60 hover:bg-decoration-subtle dark:bg-card/5 dark:hover:bg-card/10"
            />
          </div>
        </motion.section>
      </div>
    </motion.div>
  );
}
