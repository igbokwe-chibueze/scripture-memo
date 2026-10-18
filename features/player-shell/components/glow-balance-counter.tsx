"use client";

/** A compact balance with one shared disclosure for mouse, keyboard and touch. */
import { useLocale, useTranslations } from "next-intl";
import { GlowGem } from "@/components/shared/game-artwork";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { formatGlowBalance } from "../lib/format-glow-balance";
import styles from "./player-shell.module.css";

/** The authorized shell already provides the exact value; disclosure adds no reads. */
export function GlowBalanceCounter({ value }: { value: number }): React.ReactNode {
  const locale = useLocale();
  const t = useTranslations("PlayerTopBar");
  const label = t("glowPoints");
  const exact = new Intl.NumberFormat(locale).format(value);

  return (
    <Popover>
      <PopoverTrigger
        className={`${styles.counter} ${styles.balanceTrigger}`}
        openOnHover
        delay={150}
        aria-label={`${label}: ${exact}`}
      >
        <GlowGem className={styles.counterArtwork} />
        <span className={styles.counterValue}>{formatGlowBalance(value, locale)}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-xs rounded-control" side="bottom">
        <PopoverTitle>{exact} {label}</PopoverTitle>
      </PopoverContent>
    </Popover>
  );
}
