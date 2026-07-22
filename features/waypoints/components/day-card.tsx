"use client";

import { useTransition } from "react";
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
import { LoadingButton } from "@/components/shared/loading-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { showActionError } from "@/lib/errors/show-action-error";
import { cn } from "@/lib/utils";
import { startGameSessionAction } from "@/features/gameplay/actions/start-game-session.action";
import type { DayCardData } from "@/features/waypoints/types/day-selection.types";

const statusPresentation = {
  LOCKED: { label: "Locked", icon: LockKeyholeIcon },
  COOLDOWN: { label: "Cooldown", icon: Clock3Icon },
  READY: { label: "Ready", icon: PlayIcon },
  COMPLETE: { label: "Complete", icon: CheckCircle2Icon },
} as const;

/** Interactive challenge-day card with visible feedback for every state. */
export function DayCard({
  card,
  waypointId,
  index,
}: {
  card: DayCardData;
  waypointId: string;
  index: number;
}): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const status = statusPresentation[card.status];
  const StatusIcon = status.icon;

  function explainBlockedDay(): void {
    if (!card.blockedReason) return;
    toast.info(card.blockedReason, {
      description: card.status === "COOLDOWN" ? "The timer updates automatically." : undefined,
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

  return (
    <Card
      className={cn(
        "relative border py-0 shadow-lg shadow-foreground/5",
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
          <span className="font-heading block text-xl font-black">{card.name}</span>
          <span className="block text-xs font-semibold text-muted-foreground">
            {card.difficulty}
          </span>
        </span>
        <Badge variant="outline" className="gap-1.5 rounded-full px-2.5 py-1">
          <StatusIcon className="size-3.5" aria-hidden="true" />
          {status.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/65 px-3 py-2.5">
          <span className="inline-flex items-center gap-2 text-sm font-semibold">
            <SparklesIcon className="size-4 text-amber-500" aria-hidden="true" />
            Reward preview
          </span>
          <span className="font-heading font-black text-amber-700 dark:text-amber-300">
            {card.reward} Glow Points
          </span>
        </div>

        {card.status === "COMPLETE" && (
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 dark:text-emerald-300">
            <FlameIcon className="size-5 fill-amber-400 text-amber-500" aria-hidden="true" />
            Flame kindled
          </div>
        )}

        {card.status === "COOLDOWN" && card.unlocksAt && (
          <div className="space-y-2 rounded-xl border border-violet-300/35 bg-violet-50/70 p-3 dark:bg-violet-950/20">
            <p className="text-xs font-bold tracking-wide text-violet-800 uppercase dark:text-violet-200">
              Ready in
            </p>
            <CountdownTimer
              targetDate={card.unlocksAt}
              label={`${card.name} unlocks in`}
              onExpire={() => router.refresh()}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4">
        {card.status === "READY" ? (
          <LoadingButton
            isPending={isPending}
            pendingLabel="Preparing challenge"
            onClick={startDay}
            className="h-12 w-full rounded-xl text-base font-black"
          >
            <PlayIcon className="size-5" aria-hidden="true" />
            Start {card.name}
          </LoadingButton>
        ) : card.status === "LOCKED" || card.status === "COOLDOWN" ? (
          <Button
            type="button"
            variant="outline"
            onClick={explainBlockedDay}
            className="h-11 w-full rounded-xl"
          >
            <StatusIcon className="size-4" aria-hidden="true" />
            {card.status === "COOLDOWN" ? "Cooling down" : "Locked"}
          </Button>
        ) : (
          <p className="w-full text-center text-sm font-bold text-emerald-700 dark:text-emerald-300">
            Challenge complete
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
