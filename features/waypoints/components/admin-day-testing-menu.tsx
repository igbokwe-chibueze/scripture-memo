"use client";

import { Fragment, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  ClockArrowUpIcon,
  EllipsisVerticalIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  ShieldPlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { showActionError } from "@/lib/errors/show-action-error";
import { cn } from "@/lib/utils";
import { startGameSessionAction } from "@/features/gameplay/actions/start-game-session.action";
import { verifyCompletionIdempotencyAction } from "@/features/gameplay/actions/verify-completion-idempotency.action";
import { overrideCooldownAction } from "@/features/progression/actions/override-cooldown.action";
import type { DayCardData } from "@/features/waypoints/types/day-selection.types";

type AdminDayTestingMenuProps = {
  waypointId: string;
  cards: DayCardData[];
};

/**
 * Keeps administrator-only challenge tools out of the ordinary learner cards.
 *
 * The menu deliberately calls the same production actions used by the normal
 * interface. It does not weaken server authorization or progression checks;
 * it only exposes safe, explicit QA entry points to administrators.
 */
export function AdminDayTestingMenu({
  waypointId,
  cards,
}: AdminDayTestingMenuProps): React.ReactNode {
  const t = useTranslations("DaySelection");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const cooldownCards = cards.filter((card) => card.status === "COOLDOWN");
  const replayCards = cards.filter(
    (card) => card.status === "COMPLETE" && Boolean(card.completedSessionId),
  );
  const hasTestingActions = cooldownCards.length > 0 || replayCards.length > 0;

  if (!hasTestingActions) return null;

  /** Proves the server rejects an early start with the precise cooldown code. */
  function verifyServerCooldown(card: DayCardData): void {
    startTransition(async () => {
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

      // A successful start means the persisted cooldown expired between the
      // server render and this request. Refresh instead of claiming a QA pass.
      toast.warning(t("cooldownNoLongerActive"), {
        duration: 4_000,
      });
      router.refresh();
    });
  }

  /** Uses the existing audited administrator override for this signed-in user. */
  function overrideCooldown(card: DayCardData): void {
    startTransition(async () => {
      const result = await overrideCooldownAction({
        waypointId,
        dayLevel: card.dayLevel,
      });
      if (!result.success) {
        showActionError(result);
        return;
      }

      toast.success(result.message, {
        duration: 4_000,
      });
      router.refresh();
    });
  }

  /** Runs rollback-only duplicate ledger probes for a completed challenge day. */
  function verifyDuplicateProtection(card: DayCardData): void {
    startTransition(async () => {
      const result = await verifyCompletionIdempotencyAction({
        waypointId,
        dayLevel: card.dayLevel,
      });
      if (!result.success) {
        showActionError(result);
        return;
      }

      toast.success(result.message, {
        duration: 4_000,
      });
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("adminTesting")}
        disabled={isPending}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "size-11 rounded-xl",
        )}
      >
        {isPending ? (
          <ClockArrowUpIcon className="size-5 animate-pulse" aria-hidden="true" />
        ) : (
          <EllipsisVerticalIcon className="size-5" aria-hidden="true" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5 font-black text-foreground">
            {t("adminTesting")}
          </DropdownMenuLabel>
          {cooldownCards.flatMap((card) => {
            const dayName = t(
              card.dayLevel.toLowerCase() as "glimmer" | "glow" | "radiance",
            );

            return [
              <DropdownMenuItem
                key={`${card.dayLevel}-verify`}
                className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                onClick={() => verifyServerCooldown(card)}
              >
                <ShieldAlertIcon aria-hidden="true" />
                {t("verifyDayLock", { day: dayName })}
              </DropdownMenuItem>,
              <DropdownMenuItem
                key={`${card.dayLevel}-unlock`}
                className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                onClick={() => overrideCooldown(card)}
              >
                <ShieldCheckIcon aria-hidden="true" />
                {t("unlockDayTesting", { day: dayName })}
              </DropdownMenuItem>,
            ];
          })}
        </DropdownMenuGroup>

        {cooldownCards.length > 0 && replayCards.length > 0 && (
          <DropdownMenuSeparator />
        )}

        {replayCards.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5 font-black text-foreground">
              {t("completedDayTests")}
            </DropdownMenuLabel>
            {replayCards.map((card) => {
              const dayName = t(
                card.dayLevel.toLowerCase() as "glimmer" | "glow" | "radiance",
              );

              return (
                <Fragment key={`${card.dayLevel}-tests`}>
                  <DropdownMenuItem
                    className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                    onClick={() => router.push(`/game/sessions/${card.completedSessionId}`)}
                  >
                    <RotateCcwIcon aria-hidden="true" />
                    {t("testReplay", { day: dayName })}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 py-2 font-bold"
                    onClick={() => verifyDuplicateProtection(card)}
                  >
                    <ShieldPlusIcon aria-hidden="true" />
                    {t("verifyDuplicateRewards", { day: dayName })}
                  </DropdownMenuItem>
                </Fragment>
              );
            })}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
