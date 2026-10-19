"use client";

import Image from "next/image";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { CheckCircle2Icon, Clock3Icon, LockKeyholeIcon, PlayIcon } from "lucide-react";
import { toast } from "sonner";
import { CountdownTimer } from "@/components/shared/countdown-timer";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import { showActionError } from "@/lib/errors/show-action-error";
import { cn } from "@/lib/utils";
import { startGameSessionAction } from "@/features/gameplay/actions/start-game-session.action";
import { CompletedModePracticeMenu } from "./completed-mode-practice-menu";
import type { DayCardData } from "../types/day-selection.types";
import type { ActionResult } from "@/types/api";
import styles from "./day-selection.module.css";

export type StartDay = (input: {
  waypointId: string;
  dayLevel: DayCardData["dayLevel"];
}) => Promise<ActionResult<{ redirectTo?: string }>>;

const statusPresentation = {
  LOCKED: { labelKey: "locked", icon: LockKeyholeIcon },
  COOLDOWN: { labelKey: "cooldown", icon: Clock3Icon },
  READY: { labelKey: "ready", icon: PlayIcon },
  COMPLETE: { labelKey: "completed", icon: CheckCircle2Icon },
} as const;

/**
 * Illustrated day card retaining the existing action and server-owned state.
 * Locked/cooldown controls explain their restriction; they never start a day.
 * Countdown expiry refreshes presentation only, leaving server enforcement intact.
 */
export function DayCard({
  card,
  waypointId,
  index,
  startDayAction = startGameSessionAction,
}: {
  card: DayCardData;
  waypointId: string;
  index: number;
  startDayAction?: StartDay;
}): React.ReactNode {
  const t = useTranslations("DaySelection");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const status = statusPresentation[card.status];
  const StatusIcon = status.icon;
  const dayKey = card.dayLevel.toLowerCase() as "glimmer" | "glow" | "radiance";
  const dayName = t(dayKey);
  const isBlocked = card.status === "LOCKED" || card.status === "COOLDOWN";
  const unlockedArtwork = dayKey === "glimmer" ? "glimmer-emblem" : dayKey;
  const artwork = isBlocked ? `${dayKey}-locked` : unlockedArtwork;
  const statusClass = styles[
    card.status.toLowerCase() as "ready" | "complete" | "locked" | "cooldown"
  ];

  /** Explain a blocked action without sending a mutation or bypassing its lock. */
  function explainBlockedDay(): void {
    if (!card.blockedReason) return;
    toast.info(card.blockedReason, {
      description: card.status === "COOLDOWN" ? t("timerUpdates") : undefined,
      duration: 4_000,
    });
  }

  /** Submit the existing validated action; errors keep the card safely retryable. */
  function startDay(): void {
    startTransition(async () => {
      try {
        const result = await startDayAction({
          waypointId,
          dayLevel: card.dayLevel,
        });
        if (!result.success) {
          showActionError(result);
          router.refresh();
          return;
        }
        toast.success(result.message, { duration: 4_000 });
        if (result.data?.redirectTo) router.push(result.data.redirectTo);
      } catch {
        // Transport failures must not leave an apparently frozen start control.
        toast.error(t("startFailed"), { duration: Infinity });
      }
    });
  }

  return (
    <article
      className={cn(styles.dayCard, statusClass)}
      aria-labelledby={`day-${index}-heading`}
      data-day-status={card.status}
    >
      <div className={styles.dayBody}>
        <Image
          src={`/images/game-ui/waypoints/${artwork}.png`}
          alt=""
          width={160}
          height={160}
          sizes="(min-width: 1024px) 150px, 27vw"
          className={styles.dayArtwork}
        />
        <div className={styles.dayCopy}>
          <h2 id={`day-${index}-heading`} className={styles.dayTitle}>
            {dayName}
          </h2>
          <p className={styles.daySubtitle}>{t(`${dayKey}Subtitle`)}</p>
          <p className={styles.reward}>
            <Image src="/images/game-ui/diamond.png" alt="" width={28} height={28} />
            {t("glowPoints", { points: card.reward })}
          </p>
          {card.status === "COMPLETE" && (
            <p className={styles.kindled}>
              <Image src="/images/game-ui/flame-lit.png" alt="" width={24} height={24} />
              {t("flameKindled")}
            </p>
          )}
        </div>
        <span className={styles.status}>
          <StatusIcon className="size-4" aria-hidden="true" />
          {t(status.labelKey)}
        </span>
      </div>

      {card.status === "COOLDOWN" && card.unlocksAt && (
        <div className={styles.countdown}>
          <span>{t("readyIn")}</span>
          <CountdownTimer
            targetDate={card.unlocksAt}
            label={t("unlocksIn", { day: dayName })}
            onExpire={() => router.refresh()}
          />
        </div>
      )}

      <div className={styles.dayAction}>
        {card.status === "READY" ? (
          <LoadingButton
            isPending={isPending}
            pendingLabel={t("preparingChallenge")}
            onClick={startDay}
            className={styles.actionButton}
          >
            <PlayIcon className="size-6 fill-current" aria-hidden="true" />
            {t("startDay", { day: dayName })}
          </LoadingButton>
        ) : isBlocked ? (
          <Button
            type="button"
            variant="secondary"
            onClick={explainBlockedDay}
            className={styles.actionButton}
          >
            <StatusIcon className="size-5" aria-hidden="true" />
            {card.status === "COOLDOWN" ? t("coolingDown") : t("locked")}
          </Button>
        ) : card.completedSessionId && card.completedModes.length > 0 ? (
          <CompletedModePracticeMenu
            sessionId={card.completedSessionId}
            dayLevel={card.dayLevel}
            completedModes={card.completedModes}
            label={t("practiceAgain")}
            className={styles.actionButton}
          />
        ) : (
          <p className={styles.completeMessage}>{t("challengeComplete")}</p>
        )}
      </div>
    </article>
  );
}
