"use client";

import { useTranslations } from "next-intl";
import { CircleHelpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GameMode } from "@/lib/generated/prisma/enums";
import styles from "./active-game.module.css";

const copyKeys = {
  DRAG_DROP: ["dragDrop", "dragInstruction"],
  PUZZLE: ["puzzle", "phraseInstruction"],
  SWAP: ["swap", "swapInstruction"],
  CUE: ["cue", "introCue"],
  FILL: ["fill", "introFill"],
} as const;

const helpKeys = {
  DRAG_DROP: "dragInstruction",
  PUZZLE: "phraseInstruction",
  SWAP: "swapHelp",
  CUE: "cueHelp",
  FILL: "fillHelp",
} as const;

/**
 * Short instructions stay on the board; detailed guidance is available only
 * through Help. The shared dialog handles focus, Escape, and touch dismissal.
 * Opening help never consumes hints, reveals the answer, or pauses an attempt.
 */
export function ActiveModeHeading({ mode }: { mode: GameMode }): React.ReactNode {
  const t = useTranslations("Gameplay");
  const [title, instruction] = copyKeys[mode];

  return (
    <div className={styles.modeHeading}>
      <div className={styles.modeCopy}>
        <div className={styles.modeTitleRow}>
          <h2 id={`${mode.toLowerCase().replaceAll("_", "-")}-title`}>
            {t(title)}
          </h2>
          <Dialog>
            <DialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 text-primary"
                />
              }
              aria-label={t("modeHelp", { mode: t(title) })}
            >
              <CircleHelpIcon className="size-5" aria-hidden="true" />
            </DialogTrigger>
            <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto p-6">
              <DialogHeader>
                <DialogTitle className="pr-12 text-xl leading-tight">
                  {t("modeHelp", { mode: t(title) })}
                </DialogTitle>
                <DialogDescription className="mt-2 text-base leading-7">
                  {t(helpKeys[mode])}
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
        <p>{t(instruction)}</p>
      </div>
    </div>
  );
}

/** Text labels accompany color dots so Swap's states do not rely on color alone. */
export function SwapTileLegend(): React.ReactNode {
  const t = useTranslations("Gameplay");
  return (
    <div className={styles.legend}>
      <span>
        <i className={styles.movableDot} aria-hidden="true" />
        {t("movableWord")}
      </span>
      <span>
        <i className={styles.selectedDot} aria-hidden="true" />
        {t("selectedWord")}
      </span>
    </div>
  );
}
