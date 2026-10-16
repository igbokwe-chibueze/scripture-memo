"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowRightIcon,
  EllipsisVerticalIcon,
  LogOutIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JourneyStageBadge } from "@/components/shared/journey-stage-badge";
import type { BeaconProgressionResult } from "@/features/beacon/types/beacon.types";
import type { DayRewardResult } from "@/features/rewards/types/reward.types";
import type { DayLevel, JourneyStage } from "@/lib/generated/prisma/enums";
import { SessionBeaconProgress } from "./session-beacon-progress";
import { GameSettingsMenuItem } from "@/components/shared/game-settings-menu-item";
import styles from "./stage-completion.module.css";

/** Client-owned presentation context; award amounts remain server-owned. */
export type StageCompletionSummary = {
  waypointNumber: number;
  verseReference: string;
  journeyStage?: JourneyStage;
  earnedXp: number;
  hasMoreCelebrations: boolean;
  audioEnabled: boolean;
  onToggleAudio: () => void;
};

/**
 * Stage-only celebration, rendered inside the existing completion dialog.
 * Its sole continuation callback preserves badge/streak/waypoint sequencing.
 * No totals are awarded here and no hint, timer, or database work occurs.
 */
export function StageCompletionCard({
  stage,
  summary,
  reward,
  beacon,
  onContinue,
}: {
  stage: DayLevel;
  summary: StageCompletionSummary;
  reward: Pick<DayRewardResult, "amount">;
  beacon: Pick<
    BeaconProgressionResult,
    "lifetimeXp" | "level" | "currentLevelStartXp" | "nextLevelXp"
  > & { leveledUp?: boolean };
  onContinue: () => void;
}): React.ReactNode {
  const t = useTranslations("Completion");
  const gameT = useTranslations("Gameplay");
  const stageT = useTranslations("DaySelection");
  const stageLabel = stageT(stage.toLowerCase() as "glimmer" | "glow" | "radiance");

  return (
    <section className={styles.card} aria-labelledby="mode-complete-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          {gameT("dayWaypoint", { day: stageLabel, number: summary.waypointNumber })}
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger
            data-slot="button"
            className={buttonVariants({
              variant: "outline",
              size: "icon",
              className: styles.menu,
            })}
            aria-label={gameT("openMenu")}
          >
            <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <GameSettingsMenuItem />
            <DropdownMenuItem onClick={summary.onToggleAudio} className="min-h-11 gap-2">
              {summary.audioEnabled ? <Volume2Icon aria-hidden="true" /> : <VolumeXIcon aria-hidden="true" />}
              {gameT("sound")} · {summary.audioEnabled ? gameT("on") : gameT("off")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <h2 id="mode-complete-title" className={styles.title}>
        {t("stageComplete", { stage: stageLabel })}
      </h2>
      <p className={styles.subtitle}>{t("allModesCompleted")}</p>
      <div className={styles.hero} aria-hidden="true">
        <div className={styles.oval} />
        <div className={styles.confetti}>
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
        <Image
          src="/images/mascot/meemo/meemo-stage-celebrate.png"
          alt=""
          width={1122}
          height={1402}
          sizes="(min-width: 640px) 280px, 55vw"
          className={styles.meemo}
        />
      </div>
      <p className={styles.reference}>{summary.verseReference}</p>
      {summary.journeyStage && (
        <div className={styles.stage}>
          <JourneyStageBadge stage={summary.journeyStage} />
        </div>
      )}
      <div className={styles.statusStrip}>
        <span>
          <Image src="/images/game-ui/beacon.png" alt="" width={48} height={48} />
          {t("completedModesCount", { count: 5, total: 5 })}
        </span>
        <span>
          <Image src="/images/game-ui/flame-lit.png" alt="" width={48} height={48} />
          {stageT("flameKindled")}
        </span>
      </div>
      <div className="text-left">
        <SessionBeaconProgress progress={beacon} />
      </div>
      {beacon.leveledUp && (
        <p className="mt-2 font-heading text-lg font-bold text-primary" role="status">
          {t("levelUp", { level: beacon.level })}
        </p>
      )}
      <div className={styles.rewards}>
        <p>
          <Image src="/images/game-ui/diamond.png" alt="" width={40} height={40} />
          {t("stageGlowPoints", { count: reward.amount })}
        </p>
        <p>
          <Image src="/images/game-ui/beacon.png" alt="" width={40} height={40} />
          {t("stageBeaconXp", { count: summary.earnedXp })}
        </p>
      </div>
      <Button type="button" size="lg" className={styles.continueButton} onClick={onContinue}>
        {summary.hasMoreCelebrations ? <ArrowRightIcon aria-hidden="true" /> : <LogOutIcon aria-hidden="true" />}
        {summary.hasMoreCelebrations ? t("continueCelebrations") : gameT("exitGameplay")}
      </Button>
    </section>
  );
}
