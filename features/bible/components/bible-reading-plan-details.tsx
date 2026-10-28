"use client";

/** Compact plan overview. Opening a reading starts the device-only plan, while
 * completion belongs in the reader (or an encouragement drawer for rest days).
 * Static descriptions and editorial labels never trigger provider/DB requests.
 */
import { useState } from "react";
import type { ReactElement } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  CheckIcon,
  ChevronDownIcon,
  InfoIcon,
  RotateCcwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { toast } from "@/lib/toast";
import { useReadingPlanProgress } from "../hooks/use-reading-plan-progress";
import { notifyReadingPlanParticipation } from "../lib/reading-plan-participation-events";
import { BiblePlanParticipants } from "./bible-plan-participants";
import {
  nextReadingPlanDay,
  resetReadingPlanProgress,
  updateReadingPlanProgress,
} from "../lib/reading-plan-progress";
import {
  type PlanChapter,
  type ReadingPlanDay,
} from "../data/new-testament-reading-plan";
import { READING_PLAN_CHAPTER_SUBTITLES } from "../data/reading-plan-chapter-subtitles";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import {
  READING_PLANS,
  type ReadingPlanDefinition,
  type ReadingPlanId,
} from "../data/reading-plan-catalog";

/** Canonical English labels match the supplied plan; UI controls are localized. */
function chapterLabel(chapter: PlanChapter): string {
  return `${BIBLE_BOOKS.find((book) => book.id === chapter.book)?.name ?? chapter.book} ${chapter.chapter}`;
}

/** The actual activity row is the dialog trigger, so closing returns focus to
 * that row rather than a hidden control elsewhere on the long phase list.
 */
function PlanActivityDialog({
  day,
  completed,
  onComplete,
  trigger,
}: {
  day: ReadingPlanDay;
  completed: boolean;
  onComplete: (day: ReadingPlanDay) => boolean;
  trigger: ReactElement;
}): React.ReactNode {
  const t = useTranslations("ReadingPlans");
  const bible = useTranslations("Bible");
  const [open, setOpen] = useState(false);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title={`${t("day", { day: day.number })} · ${t(day.kind)}`}
      description={t(`restEncouragements.${day.number % 6}`)}
      closeLabel={bible("closeHelp")}
      trigger={trigger}
    >
      <Button
        variant="secondary"
        className="min-h-11"
        onClick={() => {
          if (onComplete(day)) setOpen(false);
        }}
      >
        {t(completed ? "undo" : "markComplete")}
      </Button>
    </ResponsiveDialog>
  );
}

/** A phase uses a compact text header and description drawer. Its chapter
 * cards open the reader directly instead of selecting a redundant day panel.
 */
function PlanPhase({
  index,
  initialOpen,
  completed,
  next,
  onRead,
  onCompleteActivity,
  plan,
  completedChapters,
}: {
  index: number;
  initialOpen: boolean;
  plan: ReadingPlanDefinition;
  completedChapters: Set<string>;
  completed: Set<number>;
  next: number | null;
  onRead: (chapter: PlanChapter, day: number) => void;
  onCompleteActivity: (day: ReadingPlanDay) => boolean;
}): React.ReactNode {
  const t = useTranslations("ReadingPlans");
  const bible = useTranslations("Bible");
  const [expanded, setExpanded] = useState(initialOpen);
  const phase = plan.phases[index];
  const title = t(`${plan.phasePrefix}.${index}.title`);
  return (
    <section className="overflow-hidden rounded-card border border-border bg-card shadow-sm">
      {/* A neutral disclosure spans the header. Info remains a separate sibling
          control beside the title, never a button nested inside another button.
          Only keyboard focus is highlighted; opening does not tint the header. */}
      <div
        className={`relative grid grid-cols-[minmax(0,1fr)_1.25rem] items-center gap-x-3 px-3 py-2 ${expanded ? "border-b border-border" : ""}`}
      >
        <button
          type="button"
          className="absolute inset-0 rounded-control outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          aria-label={title}
          aria-expanded={expanded}
          aria-controls={`plan-phase-${index}`}
          onClick={() => setExpanded(!expanded)}
        />
        {/* Metadata occupies its own full row. Title/info and chevron then share
            one grid row and centreline, even when a long title wraps. */}
        <span className="pointer-events-none relative col-span-2 block text-xs font-medium text-primary">
          {t("phase", { phase: index + 1 })} ·{" "}
          {t("dayRange", { start: phase.start, end: phase.end })}
        </span>
        <div className="pointer-events-none relative flex min-w-0 items-center gap-1">
          <span className="min-w-0 font-heading text-xl">{title}</span>
          <ResponsiveDialog
            title={title}
            description={t(`${plan.phasePrefix}.${index}.description`)}
            closeLabel={bible("closeHelp")}
            trigger={
              <Button
                variant="ghost"
                size="icon-lg"
                className="pointer-events-auto size-11 shrink-0 text-primary"
                aria-label={t("aboutPhase", { phase: title })}
              >
                <InfoIcon aria-hidden="true" className="size-5" />
              </Button>
            }
          >
            <p className="text-sm text-primary">
              {t("dayRange", { start: phase.start, end: phase.end })}
            </p>
            <p>
              {phase.books
                .map((id) => BIBLE_BOOKS.find((book) => book.id === id)?.name)
                .join(" · ")}
            </p>
          </ResponsiveDialog>
        </div>
        <ChevronDownIcon
          aria-hidden="true"
          className={`pointer-events-none relative size-5 text-primary transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
        />
      </div>
      <div
        id={`plan-phase-${index}`}
        hidden={!expanded}
        className="space-y-2 p-3"
      >
        {plan.days
          .filter((day) => day.phase === index)
          .map((day) => {
            const chapter = day.chapters[0];
            const reading = day.kind === "read";
            const row = (
              <Button
                key={day.number}
                variant={next === day.number ? "secondary" : "outline"}
                className="h-auto min-h-12 w-full justify-start gap-2 whitespace-normal rounded-control px-3 py-1.5 text-left"
                onClick={
                  reading
                    ? () =>
                        onRead(
                          day.chapters.find(
                            (item) =>
                              !completedChapters.has(
                                `${item.book}:${item.chapter}`,
                              ),
                          ) ?? chapter,
                          day.number,
                        )
                    : undefined
                }
              >
                <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground">
                  {t("day", { day: day.number })}
                </span>
                <span aria-hidden="true" className="text-muted-foreground">
                  |
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={
                      plan.chapterCompletion
                        ? "block font-heading text-base leading-tight"
                        : "block truncate font-heading text-base"
                    }
                  >
                    {reading
                      ? (day.readingLabel ?? chapterLabel(chapter))
                      : t(day.kind)}
                  </span>
                  <span className="block truncate text-xs font-medium text-primary">
                    {reading && plan.chapterCompletion
                      ? t("assignedChapterProgress", {
                          count: day.chapters.filter((item) =>
                            completedChapters.has(
                              `${item.book}:${item.chapter}`,
                            ),
                          ).length,
                          total: day.chapters.length,
                        })
                      : reading
                        ? READING_PLAN_CHAPTER_SUBTITLES[chapter.book][
                            chapter.chapter - 1
                          ]
                        : t(`${day.kind}Subtitle`)}
                  </span>
                </span>
                {completed.has(day.number) && (
                  <CheckIcon
                    aria-label={t("complete")}
                    className="mr-2 size-5 shrink-0 text-primary"
                  />
                )}
              </Button>
            );
            return reading ? (
              row
            ) : (
              <PlanActivityDialog
                key={day.number}
                day={day}
                completed={completed.has(day.number)}
                onComplete={onCompleteActivity}
                trigger={row}
              />
            );
          })}
      </div>
    </section>
  );
}

/** Overview owns only presentation, local starting/reset, and prompt activities.
 * Read-day completion remains outside this component in the chapter reader.
 */
export function BibleReadingPlanDetails({
  initialDay,
  onRead,
  planId = "new-testament",
}: {
  initialDay: number | null;
  planId?: ReadingPlanId;
  onRead: (chapter: PlanChapter, day: number) => void;
}): React.ReactNode {
  const t = useTranslations("ReadingPlans");
  const bible = useTranslations("Bible");
  const plan = READING_PLANS[planId];
  const progress = useReadingPlanProgress(planId);
  const completedChapters = new Set(progress?.completedChapters);
  const completed = new Set(progress?.completedDays);
  const next = nextReadingPlanDay(progress, planId);
  const current = plan.days[(initialDay ?? next ?? plan.days.length) - 1];
  const percentage =
    Math.round((completed.size / plan.days.length) * 1000) / 10;
  const [resetOpen, setResetOpen] = useState(false);

  function openChapter(chapter: PlanChapter, day: number): void {
    try {
      // Start once, never write for ordinary subsequent chapter navigation.
      if (!progress) updateReadingPlanProgress(undefined, true, planId);
      // Existing device-only plans enroll only on this explicit reading action,
      // never by rendering/opening their overview. Completed legacy plans stay out.
      else
        notifyReadingPlanParticipation({
          planId,
          operation: next === null ? "complete" : "start",
        });
    } catch {
      toast.error(t("storageFailed"));
    }
    onRead(chapter, day);
  }

  function reset(): void {
    try {
      resetReadingPlanProgress(planId);
      setResetOpen(false);
      toast.success(t("resetSuccess"));
    } catch {
      toast.error(t("storageFailed"));
    }
  }

  function completeActivity(activity: ReadingPlanDay): boolean {
    if (activity.kind === "read") return false;
    try {
      const wasComplete = completed.has(activity.number);
      updateReadingPlanProgress(activity.number, !wasComplete, planId);
      toast.success(t(wasComplete ? "dayReopened" : "dayCompleted"));
      return true;
    } catch {
      toast.error(t("storageFailed"));
      return false;
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="space-y-3">
        <h1 className="font-heading text-3xl sm:text-5xl">
          {t(plan.titleKey)}
        </h1>
        <p className="text-sm text-muted-foreground">{t(plan.introKey)}</p>
        <BiblePlanParticipants planId={planId} />
        {/* Keep the approved header height; object-cover crops without stretching
            the supplied square art. Phase placeholders remain independent. */}
        <div className="relative min-h-40 overflow-hidden rounded-card sm:min-h-52">
          <Image
            src={plan.cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 896px, 100vw"
            className="object-cover object-top"
          />
        </div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-primary">
            {t("planDuration", {
              days: plan.days.length,
              books: plan.bookCount,
            })}
          </p>
          <ResponsiveDialog
            title={t(plan.titleKey)}
            description={t(plan.descriptionKey)}
            closeLabel={bible("closeHelp")}
            trigger={
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-11 shrink-0 text-primary"
                aria-label={t("aboutPlan")}
              >
                <InfoIcon aria-hidden="true" className="size-5" />
              </Button>
            }
          >
            <p className="font-medium text-primary">
              {t("planDuration", {
                days: plan.days.length,
                books: plan.bookCount,
              })}
            </p>
            <p className="leading-relaxed">{t(plan.activitiesKey)}</p>
            <p className="leading-relaxed">{t(plan.paceKey)}</p>
            <p className="text-sm text-muted-foreground">{t("deviceOnly")}</p>
          </ResponsiveDialog>
        </div>
      </header>
      <section
        className="space-y-3 rounded-card border border-border bg-card p-4 sm:p-5"
        aria-label={t("progressLabel")}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-xl">
            {t(next === null ? "finished" : "yourProgress")}
          </h2>
          <span className="text-sm font-medium">
            {t("progress", {
              count: completed.size,
              total: plan.days.length,
            })}
          </span>
        </div>
        {/* One mobile row keeps reset, fill and percentage together. The reset
            trigger retains a 44px touch target without consuming a second row. */}
        <div className="flex min-h-11 items-center gap-2 sm:gap-3">
          {progress && (
            <ResponsiveDialog
              open={resetOpen}
              onOpenChange={setResetOpen}
              title={t("reset")}
              description={t("resetWarning")}
              closeLabel={bible("closeHelp")}
              trigger={
                <Button
                  variant="ghost"
                  className="min-h-11 shrink-0 gap-1 px-2 text-xs sm:text-sm"
                >
                  <RotateCcwIcon aria-hidden="true" />
                  {t("reset")}
                </Button>
              }
            >
              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setResetOpen(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  className="min-h-11"
                  onClick={reset}
                >
                  {t("confirmReset")}
                </Button>
              </div>
            </ResponsiveDialog>
          )}
          <div
            role="progressbar"
            aria-label={t("progressLabel")}
            aria-valuemin={0}
            aria-valuemax={plan.days.length}
            aria-valuenow={completed.size}
            className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
              style={{
                width: `${(completed.size / plan.days.length) * 100}%`,
              }}
            />
          </div>
          <span className="min-w-10 text-right text-sm font-bold text-primary">
            {t("percentage", { value: percentage })}
          </span>
        </div>
      </section>
      <section className="space-y-5" aria-label={t("schedule")}>
        <h2 className="font-heading text-2xl">{t("schedule")}</h2>
        {plan.phases.map((phase, index) => (
          <PlanPhase
            key={phase.start}
            index={index}
            plan={plan}
            completedChapters={completedChapters}
            initialOpen={current.phase === index}
            completed={completed}
            next={next}
            onRead={openChapter}
            onCompleteActivity={completeActivity}
          />
        ))}
      </section>
    </div>
  );
}
