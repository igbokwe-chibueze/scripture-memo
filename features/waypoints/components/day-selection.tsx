"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertTriangleIcon, BookHeartIcon, Clock3Icon, LockKeyholeIcon, ShieldOffIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { JourneyStageBadge } from "@/components/shared/journey-stage-badge";
import { DayCard } from "@/features/waypoints/components/day-card";
import type { DayCardData, DaySelectionData } from "@/features/waypoints/types/day-selection.types";
import { JourneyStage } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

/** Mobile-first interactive composition for one waypoint's three-day challenge. */
export function DaySelection({
  data,
  cards,
  isAdmin,
}: {
  data: DaySelectionData;
  cards: DayCardData[];
  isAdmin: boolean;
}): React.ReactNode {
  const t = useTranslations("DaySelection");
  const hintsUnavailable =
    data.journeyStage === JourneyStage.STRENGTHEN ||
    data.journeyStage === JourneyStage.MASTER;
  const timeNotice = {
    [JourneyStage.LEARN]: null,
    [JourneyStage.RECALL]: t("recallTime"),
    [JourneyStage.STRENGTHEN]: t("strengthenTime"),
    [JourneyStage.MASTER]: t("masterTime"),
  }[data.journeyStage];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-sky-300/35 bg-linear-to-br from-sky-100 via-card to-amber-100/70 p-5 shadow-xl dark:from-sky-950/50 dark:via-card dark:to-amber-950/25 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-black tracking-[0.18em] text-sky-700 uppercase dark:text-sky-300">
            {t("waypoint", { number: data.waypointNumber })}
          </p>
          <JourneyStageBadge stage={data.journeyStage} className="h-8 px-3" />
        </div>
        <h1 className="mt-4 font-heading text-3xl font-black tracking-tight sm:text-4xl">
          {data.reference}
        </h1>
        <p className="mt-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">
          {data.translation}
        </p>
        {data.studyAccess === "PRE_STUDY" && (
          <blockquote className="mt-5 border-l-4 border-amber-400 pl-4 text-base leading-7 font-medium text-foreground/90 sm:text-lg">
            {data.translationText}
          </blockquote>
        )}
        <div className="mt-5">
          {data.studyAccess === "LOCKED" ? (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-300/40 bg-background/70 px-4 text-sm font-bold text-violet-700 dark:text-violet-300">
              <LockKeyholeIcon className="size-4" aria-hidden="true" /> {t("studyReopens")}
            </span>
          ) : (
            <Link
              href={`/sanctuary/${data.verseId}`}
              className={cn(buttonVariants({ variant: "outline" }), "min-h-11 rounded-xl px-4 font-black")}
            >
              <BookHeartIcon aria-hidden="true" /> {t("studyVerse")}
            </Link>
          )}
        </div>
      </section>

      {(hintsUnavailable || timeNotice) && (
        <section aria-label={t("stageRules")} className="grid gap-3 sm:grid-cols-2">
          {hintsUnavailable && (
            <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-50/70 p-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
              <ShieldOffIcon className="size-6 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-bold">{t("noHints")}</p>
                <p className="text-xs opacity-80">{t("memoryAlone")}</p>
              </div>
            </div>
          )}
          {timeNotice && (
            <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-violet-300/40 bg-violet-50/70 p-4 text-violet-950 dark:bg-violet-950/20 dark:text-violet-100">
              <Clock3Icon className="size-6 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-bold">{t("timedChallenge")}</p>
                <p className="text-xs opacity-80">{timeNotice}</p>
              </div>
            </div>
          )}
        </section>
      )}

      <section aria-labelledby="challenge-days-heading" className="space-y-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-black tracking-[0.16em] text-amber-700 uppercase dark:text-amber-300">
            <AlertTriangleIcon className="size-4" aria-hidden="true" />
            {t("threeDayChallenge")}
          </p>
          <h2 id="challenge-days-heading" className="mt-1 font-heading text-2xl font-black">
            {t("chooseChallenge")}
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {cards.map((card, index) => (
            <DayCard
              key={card.dayLevel}
              card={card}
              waypointId={data.waypointId}
              index={index}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
