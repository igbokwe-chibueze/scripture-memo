"use client";

import { CheckIcon, LockKeyholeIcon, MapIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BeaconLeague } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LeagueEmblem } from "@/features/beacon/components/league-emblem";
import { LEAGUE_CATALOG } from "@/features/beacon/data/league-catalog";
import { cn } from "@/lib/utils";

/** Shows every league so future progression is visible and motivating. */
export function LeagueJourneyDialog({
  currentLeague,
}: {
  currentLeague: BeaconLeague;
}): React.ReactNode {
  const t = useTranslations("Leaderboard");
  const currentIndex = LEAGUE_CATALOG.findIndex(
    (entry) => entry.league === currentLeague,
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" className="min-h-11 rounded-xl font-black" />
        }
      >
        <MapIcon aria-hidden="true" />
        {t("viewLeagues")}
      </DialogTrigger>
      <DialogContent className="top-auto bottom-0 left-0 max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-[2rem] rounded-b-none border-violet-400/30 bg-linear-to-b from-background via-background to-violet-500/10 p-5 pt-16 transition-transform duration-300 data-starting-style:translate-y-full data-ending-style:translate-y-full sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:p-7 sm:pt-16 sm:data-starting-style:-translate-y-1/2 sm:data-ending-style:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="font-heading text-3xl font-black">
            {t("leagueJourney")}
          </DialogTitle>
          <DialogDescription>{t("leagueJourneyDescription")}</DialogDescription>
        </DialogHeader>

        <ol className="mt-2 grid gap-3 sm:grid-cols-2">
          {LEAGUE_CATALOG.map((entry, index) => {
            const isCurrent = entry.league === currentLeague;
            const isReached = index < currentIndex;
            return (
              <li
                key={entry.league}
                className={cn(
                  "relative grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 overflow-hidden rounded-2xl border bg-linear-to-br p-3",
                  entry.accentClass,
                  isCurrent && "border-amber-400 ring-2 ring-amber-400/25",
                  index > currentIndex && "saturate-50",
                )}
              >
                <LeagueEmblem
                  league={entry.league}
                  label={t("leagueEmblemAlt", { league: t(`leagues.${entry.league}`) })}
                />
                <div>
                  <p className="text-xs font-black tracking-[0.14em] text-muted-foreground uppercase">
                    {t("leagueStep", { number: entry.sequence })}
                  </p>
                  <p className="font-heading text-lg font-black">
                    {t(`leagues.${entry.league}`)}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold">
                    {isCurrent ? <MapIcon className="size-4" /> : isReached ? <CheckIcon className="size-4" /> : <LockKeyholeIcon className="size-4" />}
                    {isCurrent ? t("currentLeague") : isReached ? t("reachedLeague") : t("futureLeague")}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
