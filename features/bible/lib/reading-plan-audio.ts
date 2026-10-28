/** Schedule-only audio traversal. Never skips a rest day, completed chapter or
 * repeated assignment; audio follows the plan's order, not canonical book order.
 */
import {
  READING_PLANS,
  type ReadingPlanId,
} from "../data/reading-plan-catalog";
import type { PlanChapter } from "../data/new-testament-reading-plan";

export type PlanAudioNext =
  | { kind: "chapter"; day: number; chapter: PlanChapter }
  | { kind: "rest"; day: number }
  | { kind: "finished" };

/** Explicit day provenance prevents an ordinary passage from advancing a plan. */
export function nextPlanAudioChapter(
  planId: ReadingPlanId,
  dayNumber: number,
  current: PlanChapter,
): PlanAudioNext {
  const plan = READING_PLANS[planId];
  const day = plan.days[dayNumber - 1];
  const index =
    day?.chapters.findIndex(
      (item) => item.book === current.book && item.chapter === current.chapter,
    ) ?? -1;
  if (!day || index < 0) return { kind: "finished" };
  const sameDay = day.chapters[index + 1];
  if (sameDay) return { kind: "chapter", day: dayNumber, chapter: sameDay };
  const nextDay = plan.days[dayNumber];
  if (!nextDay) return { kind: "finished" };
  if (nextDay.kind === "rest") return { kind: "rest", day: nextDay.number };
  return { kind: "chapter", day: nextDay.number, chapter: nextDay.chapters[0] };
}
