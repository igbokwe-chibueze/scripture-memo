"use client";

/** Guided reading is independent of game rewards and synced bookmarks. The
 * owner's schedule is static; completion is explicit and stays in this browser.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { BibleArtPlaceholder } from "./bible-art-placeholder";
import { BibleIllustratedCard } from "./bible-illustrated-card";
import { useReadingPlanProgress } from "../hooks/use-reading-plan-progress";
import {
  nextReadingPlanDay,
  updateReadingPlanProgress,
} from "../lib/reading-plan-progress";
import {
  NEW_TESTAMENT_PHASES,
  NEW_TESTAMENT_READING_DAYS,
  type PlanChapter,
} from "../data/new-testament-reading-plan";
import { BIBLE_BOOKS } from "../data/bible-catalog";

/** Short canonical reference labels contain no translation-specific verse text. */
function chapterLabel(chapter: PlanChapter): string {
  return `${BIBLE_BOOKS.find((book) => book.id === chapter.book)?.name ?? chapter.book} ${chapter.chapter}`;
}

/** Discovery card opens the overview without creating progress or fetching text. */
export function BibleReadingPlanCard({
  onOpen,
}: {
  onOpen: () => void;
}): React.ReactNode {
  const t = useTranslations("ReadingPlans");
  const bible = useTranslations("Bible");
  const progress = useReadingPlanProgress();
  const [showAll, setShowAll] = useState(false);
  // Use the same square artwork/caption/arrow composition as testament cards.
  // The Old Testament entry is an explicit preview, not an invented schedule.
  // Only the supplied New Testament plan reads or changes local progress.
  const plans = [
    {
      id: "nt-365",
      title: t("title"),
      subtitle: progress
        ? t("progress", { count: progress.completedDays.length })
        : t("duration"),
      onOpen,
    },
    {
      id: "ot-365",
      title: t("oldTestamentTitle"),
      subtitle: t("comingSoon"),
      onOpen: () => toast.info(t("comingSoon")),
    },
  ];
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold">{t("heading")}</h2>
        <Button
          variant="ghost"
          className="min-h-11"
          aria-expanded={showAll}
          aria-controls="bible-reading-plan-cards"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? bible("showLess") : t("viewMore")}
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
      <div
        id="bible-reading-plan-cards"
        aria-label={t("heading")}
        className={
          showAll
            ? "grid grid-cols-2 gap-3 pb-2"
            : "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3"
        }
      >
        {plans.map((plan) => (
          <BibleIllustratedCard
            key={plan.id}
            title={plan.title}
            subtitle={plan.subtitle}
            placeholderLabel={bible("illustrationPlaceholder")}
            onClick={plan.onOpen}
            compactTitle
            className={
              showAll
                ? "aspect-[1.125]"
                : "aspect-[1.125] basis-[calc(50%-0.375rem)] snap-start"
            }
          />
        ))}
      </div>
    </section>
  );
}

/** Day panel and phase browser. Future days can be previewed/completed freely;
 * finishing advances to the earliest unfinished day, never a calendar deadline.
 */
export function BibleReadingPlan({
  initialDay,
  onRead,
}: {
  initialDay: number | null;
  onRead: (chapter: PlanChapter, day: number) => void;
}): React.ReactNode {
  const t = useTranslations("ReadingPlans");
  const progress = useReadingPlanProgress();
  const [chosenDay, setChosenDay] = useState<number | null>(initialDay);
  const next = nextReadingPlanDay(progress);
  const day = NEW_TESTAMENT_READING_DAYS[(chosenDay ?? next ?? 365) - 1];
  const completed = new Set(progress?.completedDays);
  const panel = "rounded-card border border-border bg-card p-4 sm:p-5";

  function save(dayNumber?: number, complete = true): void {
    try {
      updateReadingPlanProgress(dayNumber, complete);
      toast.success(
        t(
          dayNumber === undefined
            ? "started"
            : complete
              ? "dayCompleted"
              : "dayReopened",
        ),
      );
      if (complete) setChosenDay(null);
    } catch {
      toast.error(t("storageFailed"));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="space-y-3">
        <p className="font-medium text-primary">{t("duration")}</p>
        <h1 className="font-heading text-3xl sm:text-5xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
        <BibleArtPlaceholder className="min-h-40 sm:min-h-52" />
      </header>
      <section className={`${panel} space-y-3`} aria-label={t("progressLabel")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-xl">
            {t(next === null ? "finished" : "yourProgress")}
          </h2>
          <span className="text-sm font-medium">
            {t("progress", { count: completed.size })}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label={t("progressLabel")}
          aria-valuemin={0}
          aria-valuemax={365}
          aria-valuenow={completed.size}
          className="h-3 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] motion-reduce:transition-none"
            style={{ width: `${(completed.size / 365) * 100}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">{t("deviceOnly")}</p>
        <p className="text-sm text-muted-foreground">{t("pace")}</p>
        {!progress && (
          <Button className="min-h-11" onClick={() => save()}>
            {t("start")}
          </Button>
        )}
      </section>
      {/* The active panel stays in normal document flow. Native phase disclosures
          keep the 365-day browser compact without nested scrolling or timers. */}
      <section
        className={`${panel} space-y-4`}
        aria-labelledby="reading-plan-day"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="reading-plan-day" className="font-heading text-2xl">
            {t("day", { day: day.number })}
          </h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
            {t(day.kind)}
          </span>
        </div>
        <p className="font-medium text-primary">
          {t(`phases.${day.phase}.title`)}
        </p>
        {day.kind === "read" && (
          <h3 className="font-heading text-2xl">
            {chapterLabel(day.chapters[0])}
          </h3>
        )}
        {day.kind !== "read" && (
          <p className="leading-relaxed">{t(`${day.kind}Prompt`)}</p>
        )}
        {day.kind === "reflect" && (
          <p className="text-sm text-muted-foreground">{t("lookBack")}</p>
        )}
        {day.kind !== "yearReview" && (
          <div className="flex flex-wrap gap-3">
            {day.chapters.map((chapter) => (
              <Button
                key={`${chapter.book}:${chapter.chapter}`}
                variant={day.kind === "read" ? "default" : "outline"}
                className="min-h-11"
                onClick={() => onRead(chapter, day.number)}
              >
                <BookOpenIcon aria-hidden="true" />
                {day.kind === "read" ? t("openChapter") : chapterLabel(chapter)}
              </Button>
            ))}
          </div>
        )}
        {progress && (
          <Button
            variant={completed.has(day.number) ? "outline" : "secondary"}
            className="min-h-11 w-full sm:w-auto"
            onClick={() => save(day.number, !completed.has(day.number))}
          >
            {completed.has(day.number) && <CheckIcon aria-hidden="true" />}
            {t(completed.has(day.number) ? "undo" : "markComplete")}
          </Button>
        )}
        {next !== null && chosenDay !== null && chosenDay !== next && (
          <Button
            variant="ghost"
            className="min-h-11"
            onClick={() => setChosenDay(null)}
          >
            {t("nextDay", { day: next })}
          </Button>
        )}
      </section>
      <section className="space-y-3" aria-label={t("schedule")}>
        <h2 className="font-heading text-2xl">{t("schedule")}</h2>
        {NEW_TESTAMENT_PHASES.map((phase, index) => (
          <details key={phase.start} className={`${panel} group`}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-sm text-primary">
                  {t("phase", { phase: index + 1 })} ·{" "}
                  {t("dayRange", { start: phase.start, end: phase.end })}
                </span>
                <span className="font-heading text-xl">
                  {t(`phases.${index}.title`)}
                </span>
              </span>
              <ChevronDownIcon
                aria-hidden="true"
                className="shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <p className="my-4 text-sm leading-relaxed text-muted-foreground">
              {t(`phases.${index}.description`)}
            </p>
            <div className="space-y-2">
              {NEW_TESTAMENT_READING_DAYS.filter(
                (item) => item.phase === index,
              ).map((item) => (
                <Button
                  key={item.number}
                  variant={item.number === day.number ? "secondary" : "outline"}
                  className="h-auto min-h-12 w-full justify-start gap-3 whitespace-normal py-2 text-left"
                  aria-pressed={item.number === day.number}
                  onClick={() => {
                    setChosenDay(item.number);
                    // An explicit day choice is the only plan action that scrolls.
                    document
                      .getElementById("reading-plan-day")
                      ?.scrollIntoView({ block: "start" });
                  }}
                >
                  <span className="min-w-14 text-sm">
                    {t("day", { day: item.number })}
                  </span>
                  <span className="min-w-0 flex-1">
                    {item.kind === "read"
                      ? chapterLabel(item.chapters[0])
                      : t(item.kind)}
                  </span>
                  {completed.has(item.number) && (
                    <CheckIcon
                      aria-label={t("complete")}
                      className="text-primary"
                    />
                  )}
                </Button>
              ))}
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
