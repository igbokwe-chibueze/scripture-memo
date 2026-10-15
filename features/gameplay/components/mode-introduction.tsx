"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Clock3Icon, LightbulbIcon, PlayIcon, ShieldOffIcon } from "lucide-react";
import { LoadingButton } from "@/components/shared/loading-button";
import type { GameMode } from "@/lib/generated/prisma/enums";
import styles from "./session-introduction.module.css";

/** Fixed tutorial copy is illustrative, never extracted from the active answer. */
const instructionKeys = {
  DRAG_DROP: "introDragDrop",
  PUZZLE: "introPuzzle",
  SWAP: "introSwap",
  CUE: "introCue",
  FILL: "introFill",
} as const satisfies Record<GameMode, string>;

/** Code-native arrows illustrate motion without requiring a new icon collection. */
function SwapArrows(): React.ReactNode {
  return (
    <svg className={styles.swapArrows} viewBox="0 0 200 140" fill="none" aria-hidden="true">
      <path d="M70 28 C90 5 120 7 139 29 M139 29 L133 10 M139 29 L119 26" />
      <path d="M135 112 C115 137 85 133 66 112 M66 112 L72 131 M66 112 L87 116" />
    </svg>
  );
}

/** Static tutorial artwork only; it never starts or submits an attempt. */
function ModeDemonstration({ mode }: { mode: GameMode }): React.ReactNode {
  if (mode === "SWAP") {
    return (
      <div className={styles.swapDemo} aria-hidden="true" data-demo="swap">
        <SwapArrows />
        <span className={`${styles.wordTile} ${styles.swapFirst}`} aria-hidden="true">
          trust
        </span>
        <span className={`${styles.wordTile} ${styles.swapSecond}`} aria-hidden="true">
          Lord
        </span>
      </div>
    );
  }
  if (mode === "DRAG_DROP") {
    return (
      <div className={styles.dragDemo} aria-hidden="true">
        <span className={styles.wordTile}>trust</span>
        <span className={styles.placeArrow}>↓</span>
        <span className={styles.wordSlot}>trust</span>
      </div>
    );
  }
  if (mode === "PUZZLE") {
    return (
      <div className={styles.puzzleDemo} aria-hidden="true">
        <span className={styles.puzzlePiece}>Trust</span>
        <span className={styles.puzzlePiece}>in the</span>
        <span className={styles.puzzlePiece}>Lord</span>
      </div>
    );
  }
  return (
    <div className={styles.typingDemo} aria-hidden="true">
      <span className={styles.typingTile}>
        {mode === "CUE" && <span className={styles.firstLetter}>t</span>}
        <span className={styles.blankLine} />
        <span className={styles.caret} />
      </span>
      <span className={styles.typingContext}>in the Lord</span>
    </div>
  );
}

/**
 * Preparation surface shared by all five modes. Begin is the only mutation;
 * no countdown or attempt is started by mounting the card or its animation.
 * Hint availability and stage timing come from the existing trusted session.
 */
export function ModeIntroduction({
  mode,
  modeLabel,
  minutes,
  hintsAllowed,
  hintBalance,
  isTestHint,
  isPending,
  onBegin,
}: {
  mode: GameMode;
  modeLabel: string;
  minutes: number | null;
  hintsAllowed: boolean;
  hintBalance: number;
  isTestHint: boolean;
  isPending: boolean;
  onBegin: () => void;
}): React.ReactNode {
  const t = useTranslations("Gameplay");
  const hintLabel = !hintsAllowed
    ? t("introNoHints")
    : isTestHint
      ? t("testHint")
      : t("introHints", { count: hintBalance });

  return (
    <section className={styles.introCard} aria-labelledby="mode-introduction-title">
      <div className={styles.introScene}>
        <div className={styles.introCopy}>
          <p className={styles.upNext}>{t("upNext")}</p>
          <h2 id="mode-introduction-title" className={styles.modeTitle}>
            {modeLabel}
          </h2>
          <p className={styles.instruction}>{t(instructionKeys[mode])}</p>
        </div>
        <div className={styles.demonstration}>
          <ModeDemonstration mode={mode} />
        </div>
        <Image
          src="/images/mascot/meemo/meemo-session-guide.png"
          alt=""
          aria-hidden="true"
          width={1024}
          height={1536}
          sizes="(min-width: 1024px) 270px, 38vw"
          preload
          className={styles.meemo}
        />
      </div>
      <div className={styles.timing}>
        <Clock3Icon aria-hidden="true" />
        <div>
          <p>{minutes ? t("minuteChallenge", { minutes }) : t("introNoTimer")}</p>
          {minutes && <p className={styles.clockNote}>{t("clockStarts")}</p>}
        </div>
      </div>
      <LoadingButton
        type="button"
        size="lg"
        isPending={isPending}
        pendingLabel={t("starting")}
        onClick={onBegin}
        className={styles.beginButton}
      >
        <PlayIcon className="size-6 fill-current" aria-hidden="true" />
        {t("beginMode", { mode: modeLabel })}
      </LoadingButton>
      <p className={styles.hintNotice}>
        {hintsAllowed ? <LightbulbIcon aria-hidden="true" /> : <ShieldOffIcon aria-hidden="true" />}
        <span>{hintLabel}</span>
      </p>
    </section>
  );
}
