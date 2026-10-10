"use client";

import { useEffect, useState } from "react";
import { ArrowRightIcon, SparklesIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ShareAchievementButton } from "@/components/shared/share-achievement-button";
import { ConfettiCelebration } from "@/components/shared/confetti-celebration";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import { cn } from "@/lib/utils";

const RARITY_STYLES = {
  COMMON: "from-muted to-secondary text-foreground dark:from-muted dark:to-card dark:text-foreground",
  UNCOMMON: "from-success to-success text-success-text dark:from-success dark:to-success dark:text-success-text",
  RARE: "from-info to-info text-info-text dark:from-info dark:to-info dark:text-info-text",
  EPIC: "from-selection to-fuchsia-200 text-selection-text dark:from-selection dark:to-fuchsia-950 dark:text-selection-text",
  LEGENDARY: "from-reward via-reward to-decoration text-reward-text dark:from-reward dark:via-decoration dark:to-reward dark:text-reward-text",
} as const;

/** Counts a persisted badge reward without implying the balance is client-authored. */
function AnimatedBadgeReward({
  amount,
  reducedMotion,
}: {
  amount: number;
  reducedMotion: boolean;
}): React.ReactNode {
  const [displayAmount, setDisplayAmount] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;

    let frameId = 0;
    let startTime: number | null = null;
    const delayMs = 450;
    const durationMs = 900;

    // WHY: The animation only interpolates the server-returned display value.
    // It never changes the persisted reward or balance and is cancelled when a
    // badge sequence advances, preventing stale frames from updating the next badge.
    const updateCount = (timestamp: number): void => {
      startTime ??= timestamp;
      const elapsed = timestamp - startTime;
      if (elapsed < delayMs) {
        setDisplayAmount(0);
        frameId = window.requestAnimationFrame(updateCount);
        return;
      }

      const progress = Math.min((elapsed - delayMs) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayAmount(Math.round(amount * easedProgress));
      if (progress < 1) frameId = window.requestAnimationFrame(updateCount);
    };

    frameId = window.requestAnimationFrame(updateCount);
    return () => window.cancelAnimationFrame(frameId);
  }, [amount, reducedMotion]);

  return <>{(reducedMotion ? amount : displayAmount).toLocaleString()}</>;
}

/** Presents one persisted badge unlock and waits for explicit player dismissal. */
export function BadgeUnlockScreen({
  badge,
  onContinue,
}: {
  badge: BadgeUnlockResult;
  onContinue: () => void;
}): React.ReactNode {
  const t = useTranslations("Badges");
  const common = useTranslations("Common");
  const locale = useLocale();
  const shouldReduceMotion = useReducedMotionPreference();
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
        className="fixed inset-0 z-60 overflow-y-auto bg-background px-4 backdrop-blur-md"
        initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-unlock-title"
      >
        <div className="flex min-h-full justify-center py-4 sm:py-8">
          <motion.section
            className={cn(
              "relative my-auto w-full max-w-md overflow-hidden rounded-[2rem] border border-border/50 bg-linear-to-br p-6 text-center shadow-2xl sm:p-9",
              RARITY_STYLES[badge.rarity],
            )}
            initial={
              shouldReduceMotion
                ? false
                : {
                    opacity: 0,
                    y: 44,
                    scale: isLegendary ? 0.68 : 0.76,
                    rotate: -5,
                  }
            }
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    type: "spring",
                    stiffness: isLegendary ? 180 : 210,
                    damping: isLegendary ? 14 : 16,
                    mass: isLegendary ? 1.15 : 1,
                  }
            }
          >
            <SparklesIcon className="absolute top-6 left-6 size-5 opacity-60" aria-hidden="true" />
            <SparklesIcon className="absolute top-10 right-7 size-4 opacity-50" aria-hidden="true" />
            <motion.div
              className="mx-auto grid size-28 place-items-center rounded-full border border-border/60 bg-card/55 text-6xl shadow-xl backdrop-blur-sm dark:bg-background/20"
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

            <p className="mt-6 text-xs font-bold tracking-[0.2em] uppercase">
              {t("unlocked")}
            </p>
            <h2 id="badge-unlock-title" className="mt-2 font-heading text-4xl font-bold">
              {badge.name}
            </h2>
            <p className="mt-3 text-sm font-bold opacity-75">{badge.description}</p>
            <span className="mt-5 inline-flex rounded-full border border-current/20 bg-card/35 px-4 py-2 text-xs font-bold tracking-[0.16em] uppercase dark:bg-background/15">
              {badge.rarity}
            </span>

            <div className="mt-6 rounded-2xl border border-current/15 bg-card/45 p-4 dark:bg-background/15">
              <p className="text-xs font-bold tracking-[0.14em] uppercase">
                {t("pointsEarned")}
              </p>
              <p className="mt-1 font-heading text-3xl font-bold" aria-label={`${badge.rewardAmount} Glow Points earned`}>
                +<AnimatedBadgeReward amount={badge.rewardAmount} reducedMotion={Boolean(shouldReduceMotion)} />
              </p>
              <p className="text-xs font-bold opacity-70">{t("newBalance", { balance: badge.balance.toLocaleString(locale) })}</p>
            </div>

            <div className="mt-6 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <Button
                type="button"
                className="min-h-12 rounded-xl bg-background font-bold text-foreground hover:bg-card dark:bg-card dark:text-foreground dark:hover:bg-muted"
                onClick={onContinue}
              >
                {common("continue")}
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
              <ShareAchievementButton
                title={t("shareTitle", { name: badge.name })}
                text={t("shareText", { name: badge.name })}
                className="border-current/25 bg-card/35 hover:bg-card/55 dark:bg-background/15 dark:hover:bg-background/25"
              />
            </div>
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
