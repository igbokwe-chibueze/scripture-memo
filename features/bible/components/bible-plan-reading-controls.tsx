"use client";

/** In-reader manual completion. Multi-chapter days retain partial chapter state;
 * neither navigation nor opening a passage silently marks anything as read.
 */
import { useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import {
  READING_PLANS,
  type ReadingPlanId,
} from "../data/reading-plan-catalog";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import {
  updateReadingPlanChapter,
  updateReadingPlanProgress,
  type ReadingPlanProgress,
} from "../lib/reading-plan-progress";
import type { BibleReference } from "../schemas/bible.schema";

/** Reuse the loaded local progress; no extra account/session/provider requests. */
export function BiblePlanReadingControls({
  planId,
  dayNumber,
  reference,
  progress,
  onOpen,
}: {
  planId: ReadingPlanId;
  dayNumber: number;
  reference: BibleReference;
  progress: ReadingPlanProgress | null;
  onOpen: (reference: BibleReference) => void;
}): React.ReactNode {
  const t = useTranslations("ReadingPlans");
  const plan = READING_PLANS[planId];
  const day = plan.days[dayNumber - 1];
  const chapter = day?.chapters.find(
    (item) =>
      item.book === reference.book && item.chapter === reference.chapter,
  );
  if (!day || !chapter) return null;
  const completed = new Set(progress?.completedChapters);
  const chapterRead = completed.has(`${chapter.book}:${chapter.chapter}`);
  const dayComplete = progress?.completedDays.includes(dayNumber) ?? false;
  const readCount = day.chapters.filter((item) =>
    completed.has(`${item.book}:${item.chapter}`),
  ).length;

  function markRead(): void {
    if (!chapter) return;
    try {
      if (plan.chapterCompletion) {
        updateReadingPlanChapter(chapter, !chapterRead, planId);
        const updated = new Set(completed);
        if (chapterRead) updated.delete(`${chapter.book}:${chapter.chapter}`);
        else updated.add(`${chapter.book}:${chapter.chapter}`);
        const completedDay = day.chapters.every((item) =>
          updated.has(`${item.book}:${item.chapter}`),
        );
        toast.success(
          t(
            chapterRead
              ? "chapterReopened"
              : completedDay
                ? "dayCompleted"
                : "chapterMarked",
          ),
        );
      } else {
        updateReadingPlanProgress(dayNumber, !dayComplete, planId);
        toast.success(t(dayComplete ? "dayReopened" : "dayCompleted"));
      }
    } catch {
      toast.error(t("storageFailed"));
    }
  }

  return (
    <section
      className="mb-5 space-y-3 rounded-card border border-border bg-card p-4"
      aria-label={t("readingsForDay", { day: dayNumber })}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-medium">
          {t("day", { day: dayNumber })} · {t(plan.titleKey)}
        </span>
        {plan.chapterCompletion && (
          <span className="text-sm text-primary">
            {t("assignedChapterProgress", {
              count: readCount,
              total: day.chapters.length,
            })}
          </span>
        )}
      </div>
      {plan.chapterCompletion && (
        <div className="flex flex-wrap gap-2">
          {day.chapters.map((item) => {
            const current =
              item.book === reference.book &&
              item.chapter === reference.chapter;
            const label = `${BIBLE_BOOKS.find((book) => book.id === item.book)?.name ?? item.book} ${item.chapter}`;
            return (
              <Button
                key={`${item.book}:${item.chapter}`}
                variant={current ? "secondary" : "outline"}
                aria-pressed={current}
                className="min-h-11"
                onClick={() =>
                  onOpen({
                    ...item,
                    verse: 1,
                    translation: reference.translation,
                  })
                }
              >
                {completed.has(`${item.book}:${item.chapter}`) && (
                  <CheckIcon aria-label={t("complete")} />
                )}
                {label}
              </Button>
            );
          })}
        </div>
      )}
      <Button variant="secondary" className="min-h-11" onClick={markRead}>
        {t(
          plan.chapterCompletion
            ? chapterRead
              ? "undoChapterRead"
              : "markChapterRead"
            : dayComplete
              ? "undo"
              : "markComplete",
        )}
      </Button>
    </section>
  );
}
