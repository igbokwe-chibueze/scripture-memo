/** Shared purchase receipts for hints and permanent avatar unlocks; no persistence. */
import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { SparkleIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import { useReducedMotionPreference } from "@/hooks/use-reduced-motion-preference";
import type { AvatarKey } from "@/features/profile/data/avatar-catalog";
import type { OilShopItem } from "../types/oil-shop.types";
import styles from "./purchase-celebration.module.css";

/** Keep the existing hint preview contract while distinguishing avatar receipts. */
export type PurchaseCelebration = {
  kind?: "hints";
  item: OilShopItem;
  previousHintBalance: number;
  newHintBalance: number;
} | {
  kind: "avatar";
  avatarKey: AvatarKey;
  collection: AvatarKey[];
};

const SPARKLES = [
  { left: "14%", top: "22%", delay: 0 },
  { left: "7%", top: "56%", delay: .2 },
  { left: "21%", top: "77%", delay: .4 },
  { left: "80%", top: "34%", delay: .1 },
  { left: "88%", top: "65%", delay: .3 },
] as const;

/** Both receipts count from their previous inventory; accessible text states the final total. */
function PurchaseTotalNumber({ previous, current, reducedMotion }: {
  previous: number;
  current: number;
  reducedMotion: boolean;
}): React.ReactNode {
  const locale = useLocale();
  const [displayed, setDisplayed] = useState(previous);
  useEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    // Begin once the entrance settles, so the count-up is visible immediately
    // after the receipt appears, including small purchases of a single avatar.
    const delay = window.setTimeout(() => {
      const start = performance.now();
      const step = (now: number): void => {
        const progress = Math.min(1, (now - start) / 1200);
        setDisplayed(Math.floor(previous + (current - previous) * progress));
        if (progress < 1) frame = window.requestAnimationFrame(step);
      };
      frame = window.requestAnimationFrame(step);
    }, 350);
    return () => {
      window.clearTimeout(delay);
      window.cancelAnimationFrame(frame);
    };
  }, [previous, current, reducedMotion]);
  return (
    <>
      <span aria-hidden="true">{(reducedMotion ? current : displayed).toLocaleString(locale)}</span>
      <span className="sr-only">{current.toLocaleString(locale)}</span>
    </>
  );
}

/** Receipts stay open until dismissed and inherit shared focus/keyboard/modal behavior. */
export function PurchaseCelebrationDialog({ celebration, onClose }: {
  celebration: PurchaseCelebration | null;
  onClose: () => void;
}): React.ReactNode {
  const t = useTranslations("Shop");
  const common = useTranslations("Common");
  const animals = useTranslations("Settings.animals");
  const locale = useLocale();
  const playAudio = useAudioFeedback();
  const reducedMotion = useReducedMotionPreference();
  useEffect(() => {
    if (celebration) playAudio("shop-purchase");
  }, [celebration, playAudio]);

  const avatar = celebration?.kind === "avatar" ? celebration : null;
  const hints = celebration && celebration.kind !== "avatar" ? celebration : null;
  const name = avatar ? animals(avatar.avatarKey)
    : hints ? t("successPackName", { count: hints.item.hintQuantity }) : "";
  // Show a small representative stack, always ending with the newly unlocked
  // portrait. Count the full collection, including all three free options.
  const thumbnails = avatar
    ? [...avatar.collection.filter((key) => key !== avatar.avatarKey).slice(-2), avatar.avatarKey]
    : [];

  return (
    <Dialog open={celebration !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={styles.dialog}
        data-receipt={avatar ? "avatar" : "hints"}
      >
        {celebration && (
          <motion.div
            key={avatar?.avatarKey ?? hints?.item.id}
            className={styles.receipt}
            initial={reducedMotion ? false : { opacity: 0, scale: .94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : .3 }}
          >
            <header className={styles.header}>
              <DialogTitle className={styles.heading}>{t("purchaseComplete")}</DialogTitle>
              <Button
                variant="outline"
                size="icon-lg"
                className={styles.close}
                onClick={onClose}
                aria-label={common("close")}
              >
                <XIcon className="size-5" aria-hidden="true" />
              </Button>
            </header>
            <div className={styles.artScene} aria-hidden="true">
              <div className={styles.glow} />
              {SPARKLES.map((sparkle) => (
                <motion.span
                  key={sparkle.left}
                  className={styles.sparkle}
                  style={{ left: sparkle.left, top: sparkle.top }}
                  animate={reducedMotion ? undefined : { opacity: [.45, 1, .45], y: [0, -5, 0] }}
                  transition={{ duration: 2, delay: sparkle.delay, repeat: Infinity }}
                >
                  <SparkleIcon />
                </motion.span>
              ))}
              <Image
                src={avatar ? `/images/avatars/${avatar.avatarKey}.png` : "/images/oil-shop/hint-bulb-owner.png"}
                alt=""
                fill
                sizes="(max-width: 640px) 220px, 280px"
                className={styles.itemImage}
              />
            </div>
            <div className={styles.copy}>
              <h3 className={styles.itemName}>{name}</h3>
              <p className={avatar ? styles.unlock : styles.quantity}>
                {avatar ? t("avatarUnlocked") : t("hintCount", { count: hints?.item.hintQuantity ?? 0 })}
              </p>
              <DialogDescription className={styles.description}>
                {t(avatar ? "avatarAdded" : "hintsAdded")}
              </DialogDescription>
            </div>
            {hints && (
              <dl className={styles.breakdown}>
                <div className={styles.line}>
                  <dt>{t("previousHints")}</dt>
                  <dd>{hints.previousHintBalance.toLocaleString(locale)}</dd>
                </div>
                <div className={styles.line}>
                  <dt>{t("purchasedLabel")}</dt>
                  <dd>+{hints.item.hintQuantity.toLocaleString(locale)}</dd>
                </div>
                <div className={styles.total}>
                  <dt>{t("yourHintBalance")}</dt>
                  <dd>
                    <PurchaseTotalNumber
                      key={`${hints.previousHintBalance}-${hints.newHintBalance}`}
                      previous={hints.previousHintBalance}
                      current={hints.newHintBalance}
                      reducedMotion={reducedMotion}
                    />
                    {" "}{t("hintsUnit", { count: hints.newHintBalance })}
                  </dd>
                </div>
              </dl>
            )}
            {avatar && (
              <section className={styles.collection} aria-label={t("yourAvatarCollection")}>
                <h4>{t("yourAvatarCollection")}</h4>
                <div className={styles.collectionRow}>
                  <div className={styles.thumbnails}>
                    {thumbnails.map((key) => (
                      <span key={key} className={styles.thumbnail} data-new={key === avatar.avatarKey}>
                        <Image
                          src={`/images/avatars/${key}.png`}
                          alt={animals(key)}
                          width={64}
                          height={64}
                        />
                      </span>
                    ))}
                  </div>
                  <p className={styles.collectionCount}>
                    <strong>
                      <PurchaseTotalNumber
                        key={`${avatar.avatarKey}-${avatar.collection.length}`}
                        previous={Math.max(0, avatar.collection.length - 1)}
                        current={avatar.collection.length}
                        reducedMotion={reducedMotion}
                      />
                    </strong>
                    <span>{t("avatars")}</span>
                  </p>
                </div>
              </section>
            )}
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
