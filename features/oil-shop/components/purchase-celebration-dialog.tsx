/** Client-only shop UI shared with isolated QA; the caller owns persistence. */

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { OilShopItem } from "@/features/oil-shop/types/oil-shop.types";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";
import { HintPackArtwork } from "./hint-pack-artwork";

export type PurchaseCelebration = {
  item: OilShopItem;
  previousHintBalance: number;
  newHintBalance: number;
};

/** Counts one trusted purchased-hint balance after the earlier effects settle. */
function PurchasedHintBalance({
  previousValue,
  newValue,
  reducedMotion,
}: {
  previousValue: number;
  newValue: number;
  reducedMotion: boolean;
}): React.ReactNode {
  const [displayedValue, setDisplayedValue] = useState(previousValue);

  useEffect(() => {
    // Reduced motion resolves the trusted result directly during render. Do not
    // schedule the normal 1.5-second animation delay or a follow-up state write.
    if (reducedMotion) return;

    let animationFrame = 0;
    // WHY: The balance is deliberately the final celebration beat. Waiting for
    // the modal, Luna, particles, and item to settle prevents competing motion.
    const startTimer = window.setTimeout(() => {
      const startedAt = performance.now();
      const durationMs = 850;
      const step = (timestamp: number): void => {
        const progress = Math.min(1, (timestamp - startedAt) / durationMs);
        setDisplayedValue(Math.floor(previousValue + (newValue - previousValue) * progress));
        if (progress < 1) animationFrame = window.requestAnimationFrame(step);
      };
      animationFrame = window.requestAnimationFrame(step);
    }, 1_500);
    return () => {
      window.clearTimeout(startTimer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [newValue, previousValue, reducedMotion]);

  return (
    <motion.div
      key={reducedMotion ? newValue : displayedValue}
      initial={reducedMotion ? false : { scale: 0.94 }}
      animate={{ scale: 1 }}
      className="rounded-xl bg-muted px-3 py-2 text-center text-foreground"
    >
      <div className="mx-auto size-8">
        <HintPackArtwork quantity={1} fit />
      </div>
      <strong>{reducedMotion ? newValue : displayedValue}</strong>
    </motion.div>
  );
}

/** Animated purchase acknowledgement that remains open until the learner closes it. */
export function PurchaseCelebrationDialog({
  celebration,
  onClose,
}: {
  celebration: PurchaseCelebration | null;
  onClose: () => void;
}): React.ReactNode {
  const t = useTranslations("Shop");
  const common = useTranslations("Common");
  const playAudio = useAudioFeedback();
  const shouldReduceMotion = useReducedMotionPreference();

  useEffect(() => {
    if (celebration) playAudio("shop-purchase");
  }, [celebration, playAudio]);

  return (
    <Dialog open={celebration !== null} onOpenChange={(open) => !open && onClose()}>
      {/* The celebration inherits the same light/dark card palette as the shop;
       * Luna, warm reward effects, and motion provide the celebratory identity. */}
      <DialogContent
        showCloseButton={false}
        className="h-[calc(100dvh-1rem)] max-h-[46rem] overflow-hidden rounded-[2rem] border-2 border-border bg-card p-0 text-card-foreground sm:max-w-lg"
      >
        {celebration && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: "spring", duration: 0.75, bounce: 0.28 }
            }
            className="relative grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 px-4 pb-4 pt-5 text-center min-[390px]:px-5 min-[390px]:pb-5 min-[390px]:pt-7"
          >
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={onClose}
              aria-label={common("close")}
              className="absolute right-3 top-3 z-20 size-11 rounded-2xl"
            >
              <XIcon className="size-5" aria-hidden="true" />
            </Button>
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              {!shouldReduceMotion && Array.from({ length: 12 }, (_, index) => (
                <motion.span
                  key={index}
                  className="absolute size-2 rotate-45 bg-reward-subtle"
                  style={{ left: `${8 + ((index * 17) % 84)}%`, top: `${12 + ((index * 23) % 62)}%` }}
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                          y: [0, -18, 8],
                          rotate: [45, 160, 260],
                          opacity: [0, 1, 0],
                        }
                  }
                  transition={{ duration: 1.8, delay: index * 0.07, repeat: Infinity, repeatDelay: 0.5 }}
                />
              ))}
            </div>
            <div className="px-12">
              <p className="text-[0.6rem] font-bold tracking-[0.2em] text-reward-text uppercase min-[390px]:text-xs dark:text-reward-text">
                {t("purchaseComplete")}
              </p>
              <h2 className="mt-1 font-heading text-3xl font-bold min-[390px]:text-4xl">
                {t("trailSupplied")}
              </h2>
            </div>
            <div className="relative mx-auto h-full min-h-0 w-full max-w-sm">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <motion.div
                  className="absolute left-1/2 top-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 bg-reward/10 [mask-image:radial-gradient(circle,var(--reward)_0%,transparent_88%)]"
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : { rotate: 360, scale: [0.98, 1.04, 0.98] }
                  }
                  transition={{ rotate: { duration: 28, repeat: Infinity, ease: "linear" }, scale: { duration: 3.6, repeat: Infinity, ease: "easeInOut" } }}
                />
                <div className="absolute left-1/2 top-1/2 size-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-reward-subtle blur-[3.5rem]" />
              </div>
              <Image src="/images/mascot/luna/luna-reward.png" alt={t("celebrationAlt")} fill className="z-10 object-contain" sizes="384px" />
              <motion.div
                initial={
                  shouldReduceMotion
                    ? false
                    : { x: 30, scale: 0.4, rotate: 12 }
                }
                animate={{ x: 0, scale: 1, rotate: -4 }}
                transition={{ type: "spring", delay: 0.3, duration: 0.8 }}
                className="absolute bottom-1 right-1 z-20 size-24 overflow-hidden rounded-3xl border-2 border-border bg-muted shadow-lg min-[390px]:size-28"
              >
                <HintPackArtwork
                  quantity={celebration.item.hintQuantity}
                  fit
                />
              </motion.div>
            </div>
            <div className="mx-auto grid w-full max-w-sm grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left text-foreground min-[390px]:p-4">
              <div>
                <p className="font-heading text-lg font-bold min-[390px]:text-xl">
                  {celebration.item.name}
                </p>
                <p className="text-xs text-muted-foreground min-[390px]:text-sm">
                  {t("receivedHints", { count: celebration.item.hintQuantity })}
                </p>
              </div>
              <PurchasedHintBalance
                previousValue={celebration.previousHintBalance}
                newValue={celebration.newHintBalance}
                reducedMotion={shouldReduceMotion}
              />
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}

