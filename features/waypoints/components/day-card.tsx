"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  CheckCircle2Icon,
  Clock3Icon,
  FlameIcon,
  LockKeyholeIcon,
  PlayIcon,
  SparklesIcon,
} from "lucide-react";
import { toast } from "sonner";
import { CountdownTimer } from "@/components/shared/countdown-timer";
import { LunaMascot } from "@/components/shared/luna-mascot";
import { LoadingButton } from "@/components/shared/loading-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { showActionError } from "@/lib/errors/show-action-error";
import { cn } from "@/lib/utils";
import { startGameSessionAction } from "@/features/gameplay/actions/start-game-session.action";
import { CompletedModePracticeMenu } from "@/features/waypoints/components/completed-mode-practice-menu";
import type { DayCardData } from "@/features/waypoints/types/day-selection.types";
import type { ActionResult } from "@/types/api";

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

/** Interactive challenge-day card with visible feedback for every state. */
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
  const daySubtitle = t(`${dayKey}Subtitle`);

  function explainBlockedDay(): void {
    if (!card.blockedReason) return;
    toast.info(card.blockedReason, {
      description: card.status === "COOLDOWN" ? t("timerUpdates") : undefined,
      duration: 4_000,
    });
  }

  function startDay(): void {
    startTransition(async () => {
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
    });
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden border py-0 shadow-lg shadow-foreground/5",
        card.status === "READY" &&
          "border-available-border ring-2 ring-selection/20",
        card.status === "COMPLETE" &&
          "border-success-border bg-success-subtle",
        (card.status === "LOCKED" || card.status === "COOLDOWN") &&
          "border-border bg-muted",
      )}
    >
      <CardHeader className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 px-4 pt-4">
        <span
          className={cn(
            "grid size-13 place-items-center rounded-2xl text-lg font-bold shadow-inner",
            card.status === "COMPLETE"
              ? "bg-success text-success-foreground"
              : card.status === "READY"
                ? "bg-available-subtle text-available-text"
                : "bg-disabled text-disabled-foreground",
          )}
        >
          {index + 1}
        </span>
        <span className="min-w-0">
          <span className="font-heading block text-xl font-bold">{dayName}</span>
          <span className="block text-xs font-medium text-muted-foreground">
            {daySubtitle}
          </span>
        </span>
        <Badge variant="outline" className="gap-1.5 rounded-full px-2.5 py-1">
          <StatusIcon className="size-3.5" aria-hidden="true" />
          {t(status.labelKey)}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/65 px-3 py-2.5">
          <span className="inline-flex items-center gap-2 text-sm font-bold">
            <SparklesIcon className="size-4 text-reward-text" aria-hidden="true" />
            {t("rewardPreview")}
          </span>
          <span className="font-heading font-bold text-reward-text dark:text-reward-text">
            {t("glowPoints", { points: card.reward })}
          </span>
        </div>

        {card.status === "COMPLETE" && (
          <div className="flex items-center gap-2 text-sm font-bold text-success-text dark:text-success-text">
            <FlameIcon className="size-5 fill-reward text-reward-text" aria-hidden="true" />
            {t("flameKindled")}
          </div>
        )}

        {card.status === "COOLDOWN" && card.unlocksAt && (
          <div className="relative -mx-1 flex min-h-44 overflow-hidden rounded-card border border-border bg-muted p-4">
            <div className="relative z-10 min-w-0 flex-1">
              <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">{t("restFlame")}</p>
              <p className="mt-1 font-heading text-lg font-bold">{t("preparing", { day: dayName })}</p>
              <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">{t("lunaKeepsPlace")}</p>
              <div className="mt-3 w-fit rounded-control border border-border bg-card px-3 py-2 shadow-sm">
                <p className="text-[0.6rem] font-bold tracking-wide text-muted-foreground uppercase">{t("readyIn")}</p>
                <CountdownTimer targetDate={card.unlocksAt} label={t("unlocksIn", { day: dayName })} className="mt-1" onExpire={() => router.refresh()} />
              </div>
            </div>
            <LunaMascot pose="guide" decorative className="-mr-10 mt-auto w-28 shrink-0 self-end sm:-mr-7 sm:w-36" sizes="144px" />
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4">
        {card.status === "READY" ? (
          <LoadingButton
            isPending={isPending}
            pendingLabel={t("preparingChallenge")}
            onClick={startDay}
            className="h-12 w-full rounded-xl text-base font-bold"
          >
            <PlayIcon className="size-5" aria-hidden="true" />
            {t("startDay", { day: dayName })}
          </LoadingButton>
        ) : card.status === "LOCKED" || card.status === "COOLDOWN" ? (
          <div className="grid w-full grid-cols-1 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={explainBlockedDay}
              className="min-h-11 rounded-xl"
            >
              <StatusIcon className="size-4" aria-hidden="true" />
              {card.status === "COOLDOWN" ? t("coolingDown") : t("locked")}
            </Button>
          </div>
        ) : card.completedSessionId && card.completedModes.length > 0 ? (
          <CompletedModePracticeMenu
            sessionId={card.completedSessionId}
            dayLevel={card.dayLevel}
            completedModes={card.completedModes}
          />
        ) : (
          <p className="w-full text-center text-sm font-bold text-success-text dark:text-success-text">
            {t("challengeComplete")}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
