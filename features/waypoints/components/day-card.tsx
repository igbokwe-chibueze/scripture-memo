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
  RotateCcwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
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
import { overrideCooldownAction } from "@/features/progression/actions/override-cooldown.action";
import type { DayCardData } from "@/features/waypoints/types/day-selection.types";

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
  isAdmin,
}: {
  card: DayCardData;
  waypointId: string;
  index: number;
  isAdmin: boolean;
}): React.ReactNode {
  const t = useTranslations("DaySelection");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isVerifyingCooldown, startCooldownVerification] = useTransition();
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
      const result = await startGameSessionAction({
        waypointId,
        dayLevel: card.dayLevel,
      });
      if (!result.success) {
        showActionError(result);
        router.refresh();
        return;
      }

      toast.success(result.message, { duration: 4_000 });
      if (result.data) router.push(result.data.redirectTo);
    });
  }

  function overrideCooldown(): void {
    startTransition(async () => {
      const result = await overrideCooldownAction({
        waypointId,
        dayLevel: card.dayLevel,
      });
      if (!result.success) {
        showActionError(result);
        return;
      }

      toast.success(result.message, { duration: 4_000 });
      router.refresh();
    });
  }

  /**
   * Calls the production session-start action while this card is still in its
   * cooldown state. The check passes only for the stable cooldown conflict
   * code, so an unrelated authentication or persistence failure cannot create
   * a false-positive QA result.
   */
  function verifyServerCooldown(): void {
    startCooldownVerification(async () => {
      const result = await startGameSessionAction({
        waypointId,
        dayLevel: card.dayLevel,
      });

      if (!result.success && result.errorCode === "PRG-004") {
        toast.success(t("serverLockVerified"), {
          duration: 4_000,
        });
        return;
      }

      if (!result.success) {
        showActionError(result);
        return;
      }

      // A successful start means the persisted cooldown was no longer active.
      // Refresh rather than claiming that the server-side lock passed.
      toast.warning(t("cooldownNoLongerActive"), {
        duration: 4_000,
      });
      router.refresh();
    });
  }

  function openTestReplay(): void {
    if (card.completedSessionId) {
      router.push(`/game/sessions/${card.completedSessionId}`);
    }
  }

  return (
    <Card
      className={cn(
        "relative overflow-hidden border py-0 shadow-lg shadow-foreground/5",
        card.status === "READY" && "border-amber-400/60 ring-2 ring-amber-300/20",
        card.status === "COMPLETE" && "border-emerald-400/45 bg-emerald-50/70 dark:bg-emerald-950/20",
        (card.status === "LOCKED" || card.status === "COOLDOWN") && "bg-card/75",
      )}
    >
      <CardHeader className="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 px-4 pt-4">
        <span
          className={cn(
            "grid size-13 place-items-center rounded-2xl text-lg font-black shadow-inner",
            card.status === "COMPLETE"
              ? "bg-emerald-500 text-white"
              : card.status === "READY"
                ? "bg-linear-to-br from-amber-300 to-orange-500 text-amber-950"
                : "bg-muted text-muted-foreground",
          )}
        >
          {index + 1}
        </span>
        <span className="min-w-0">
          <span className="font-heading block text-xl font-black">{dayName}</span>
          <span className="block text-xs font-semibold text-muted-foreground">
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
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <SparklesIcon className="size-4 text-amber-500" aria-hidden="true" />
            {t("rewardPreview")}
          </span>
          <span className="font-heading font-black text-amber-700 dark:text-amber-300">
            {t("glowPoints", { points: card.reward })}
          </span>
        </div>

        {card.status === "COMPLETE" && (
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            <FlameIcon className="size-5 fill-amber-400 text-amber-500" aria-hidden="true" />
            {t("flameKindled")}
          </div>
        )}

        {card.status === "COOLDOWN" && card.unlocksAt && (
          <div className="relative -mx-1 flex min-h-44 overflow-hidden rounded-2xl border border-violet-300/40 bg-linear-to-br from-background via-violet-50/80 to-violet-100/90 p-4 dark:via-violet-950/30 dark:to-violet-950/60">
            <div className="relative z-10 min-w-0 flex-1">
              <p className="text-xs font-black tracking-[0.14em] text-violet-700 uppercase dark:text-violet-300">{t("restFlame")}</p>
              <p className="mt-1 font-heading text-lg font-black">{t("preparing", { day: dayName })}</p>
              <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">{t("lunaKeepsPlace")}</p>
              <div className="mt-3 w-fit rounded-xl border border-violet-300/40 bg-background/80 px-3 py-2 shadow-sm">
                <p className="text-[0.6rem] font-black tracking-wide text-violet-700 uppercase dark:text-violet-300">{t("readyIn")}</p>
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
            className="h-12 w-full rounded-xl text-base font-black"
          >
            <PlayIcon className="size-5" aria-hidden="true" />
            {t("startDay", { day: dayName })}
          </LoadingButton>
        ) : card.status === "LOCKED" || card.status === "COOLDOWN" ? (
          <div
            className={cn(
              "grid w-full gap-2",
              isAdmin && card.status === "COOLDOWN"
                ? "grid-cols-1 sm:grid-cols-3"
                : "grid-cols-1",
            )}
          >
            <Button
              type="button"
              variant="outline"
              onClick={explainBlockedDay}
              className="min-h-11 rounded-xl"
            >
              <StatusIcon className="size-4" aria-hidden="true" />
              {card.status === "COOLDOWN" ? t("coolingDown") : t("locked")}
            </Button>
            {isAdmin && card.status === "COOLDOWN" && (
              <LoadingButton
                isPending={isVerifyingCooldown}
                pendingLabel={t("verifyingLock")}
                variant="outline"
                onClick={verifyServerCooldown}
                className="min-h-11 rounded-xl px-2 text-xs sm:text-sm"
              >
                <ShieldAlertIcon className="size-4" aria-hidden="true" />
                {t("verifyServerLock")}
              </LoadingButton>
            )}
            {isAdmin && card.status === "COOLDOWN" && (
              <LoadingButton
                isPending={isPending}
                pendingLabel={t("unlocking")}
                variant="secondary"
                onClick={overrideCooldown}
                className="min-h-11 rounded-xl px-2 text-xs sm:text-sm"
              >
                <ShieldCheckIcon className="size-4" aria-hidden="true" />
                {t("unlockTesting")}
              </LoadingButton>
            )}
          </div>
        ) : isAdmin && card.completedSessionId ? (
          <Button
            type="button"
            variant="outline"
            onClick={openTestReplay}
            className="h-12 w-full rounded-xl font-black"
          >
            <RotateCcwIcon className="size-4" aria-hidden="true" />
            {t("testReplay", { day: dayName })}
          </Button>
        ) : (
          <p className="w-full text-center text-sm font-bold text-emerald-700 dark:text-emerald-300">
            {t("challengeComplete")}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
