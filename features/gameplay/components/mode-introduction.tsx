"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Clock3Icon, LightbulbIcon, PlayIcon, ShieldOffIcon } from "lucide-react";
import { LoadingButton } from "@/components/shared/loading-button";
import type { GameMode } from "@/lib/generated/prisma/enums";
import { ModeIllustration } from "./mode-illustration";
import { cn } from "@/lib/utils";
import styles from "./session-introduction.module.css";

/** Fixed tutorial copy is illustrative, never extracted from the active answer. */
const instructionKeys = {
  DRAG_DROP: "introDragDrop",
  PUZZLE: "introPuzzle",
  SWAP: "introSwap",
  CUE: "introCue",
  FILL: "introFill",
} as const satisfies Record<GameMode, string>;

/**
 * Preparation surface shared by all five modes. Begin is the only mutation;
 * no countdown or attempt is started by mounting the card or its illustration.
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
    <section
      className={cn(styles.introCard, mode === "DRAG_DROP" && styles.dragIntro)}
      aria-labelledby="mode-introduction-title"
    >
      <div className={styles.introScene}>
        <div className={styles.introCopy}>
          <p className={styles.upNext}>{t("upNext")}</p>
          <h2 id="mode-introduction-title" className={styles.modeTitle}>
            {modeLabel}
          </h2>
          <p className={styles.instruction}>{t(instructionKeys[mode])}</p>
        </div>
        <div className={styles.demonstration}>
          <ModeIllustration mode={mode} />
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
