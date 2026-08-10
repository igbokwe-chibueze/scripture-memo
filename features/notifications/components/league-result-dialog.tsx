"use client";

import { useTranslations } from "next-intl";
import { LunaMascot } from "@/components/shared/luna-mascot";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export type LeagueResultOutcome = "promoted" | "demoted" | "stayed";

export type LeagueResultDialogProps = {
  open: boolean;
  outcome: LeagueResultOutcome;
  league: string;
  finalRank: number | null;
  crownAward: number;
  pending?: boolean;
  onContinue: () => void;
};

/**
 * Celebrates one finalized weekly placement without dismissing itself.
 *
 * WHY: Weekly movement is a meaningful game milestone. Requiring the Continue
 * button ensures a tap outside the card cannot make the result disappear before
 * the player has understood it.
 */
export function LeagueResultDialog({
  open,
  outcome,
  league,
  finalRank,
  crownAward,
  pending = false,
  onContinue,
}: LeagueResultDialogProps): React.ReactNode {
  const t = useTranslations("Notifications");

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-[2rem] border-primary/30 p-5 text-center duration-500 sm:max-w-md"
      >
        <LunaMascot
          pose={
            outcome === "demoted"
              ? "encourage"
              : outcome === "stayed"
                ? "retry"
                : "celebrate"
          }
          decorative
          sizes="180px"
          className="mx-auto h-36 w-auto"
        />
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-primary uppercase">
            {t("weeklyResult")}
          </p>
          <DialogTitle className="mt-2 font-heading text-3xl font-black">
            {t(`${outcome}Title`)}
          </DialogTitle>
          <DialogDescription className="mt-2 text-base">
            {t(`${outcome}Body`, { league })}
          </DialogDescription>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-3xl bg-muted p-3">
          <div className="rounded-2xl bg-card p-3">
            <p className="text-xs font-bold text-muted-foreground">{t("finalRank")}</p>
            <p className="font-heading text-2xl font-black">
              {finalRank ? `#${finalRank}` : "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-card p-3">
            <p className="text-xs font-bold text-muted-foreground">{t("crowns")}</p>
            <p className="font-heading text-2xl font-black">+{crownAward}</p>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={pending}
          onClick={onContinue}
        >
          {t("continue")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
