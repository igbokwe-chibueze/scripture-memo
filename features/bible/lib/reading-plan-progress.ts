/** Device-only plan progress. No account data, timers, server actions or DB work.
 * The versioned key isolates this immutable schedule from future plan revisions.
 */
import { z } from "zod";
import { notifyReadingPlanParticipation } from "./reading-plan-participation-events";
import {
  NEW_TESTAMENT_READING_DAYS,
  type PlanChapter,
} from "../data/new-testament-reading-plan";
import {
  READING_PLANS,
  type ReadingPlanId,
} from "../data/reading-plan-catalog";

// Retain the original key so existing browsers keep their completed chapters.
// The payload version, rather than the legacy key name, identifies the schedule.
const KEYS: Record<ReadingPlanId, string> = {
  "new-testament": "scripture-memo:reading-plan:nt-365:v1",
  "old-testament": "scripture-memo:reading-plan:ot-365:v1",
};
const EVENT = "scripture-memo:reading-plan-change";
/** Different plans validate against their own immutable schedule. Chapter keys
 * are bounded canonical assignments, not URLs or arbitrary browser-provided IDs.
 */
function progressSchemaFor(planId: ReadingPlanId) {
  const plan = READING_PLANS[planId];
  const allowed = new Set(
    plan.days.flatMap((day) =>
      day.chapters.map((chapter) => `${chapter.book}:${chapter.chapter}`),
    ),
  );
  return z.object({
    version: z.literal(2),
    startedAt: z.string().datetime(),
    completedDays: z
      .array(z.number().int().min(1).max(plan.days.length))
      .max(plan.days.length),
    completedChapters: z
      .array(z.string().refine((key) => allowed.has(key)))
      .max(allowed.size)
      .optional(),
  });
}
// Build schemas once; browser snapshot reads do not rebuild chapter sets.
const schemas = {
  "new-testament": progressSchemaFor("new-testament"),
  "old-testament": progressSchemaFor("old-testament"),
};
const legacyProgressSchema = z.object({
  version: z.literal(1),
  startedAt: z.string().datetime(),
  completedDays: z.array(z.number().int().min(1).max(365)).max(365),
});
/** Only explicit starting/completing/undoing writes this small local record. */
export type ReadingPlanProgress = z.infer<ReturnType<typeof progressSchemaFor>>;

/** Primitive snapshots are stable for useSyncExternalStore and SSR-safe. */
export function readReadingPlanSnapshot(
  planId: ReadingPlanId = "new-testament",
): string {
  try {
    return window.localStorage.getItem(KEYS[planId]) ?? "";
  } catch {
    return "";
  }
}

/** Validate all browser JSON. Legacy five-reading/two-rest completions map by
 * chapter ordinal, never by the now-changed day number. Old rest completions
 * cannot claim the newly placed rest days. Conversion is in memory only: the
 * next explicit completion saves version 2; ordinary reads never write.
 */
export function parseReadingPlanProgress(
  snapshot: string,
  planId: ReadingPlanId = "new-testament",
): ReadingPlanProgress | null {
  try {
    const value: unknown = JSON.parse(snapshot);
    const schema = schemas[planId];
    let parsed = schema.safeParse(value);
    if (!parsed.success) {
      if (planId !== "new-testament") return null;
      const legacy = legacyProgressSchema.safeParse(value);
      if (!legacy.success) return null;
      const readings = NEW_TESTAMENT_READING_DAYS.filter(
        (day) => day.kind === "read",
      );
      const completedDays = legacy.data.completedDays.flatMap((day) => {
        const weekday = (day - 1) % 7;
        if (day === 365 || weekday >= 5) return [];
        const chapterIndex = Math.floor((day - 1) / 7) * 5 + weekday;
        return [readings[chapterIndex].number];
      });
      parsed = schema.safeParse({
        ...legacy.data,
        version: 2,
        completedDays,
      });
    }
    // Chapter-completion plans derive days from their assigned chapter keys.
    // This prevents a partial day becoming complete after a refresh or edit.
    if (parsed.success && READING_PLANS[planId].chapterCompletion) {
      const chapters = new Set(parsed.data.completedChapters ?? []);
      return {
        ...parsed.data,
        completedChapters: [...chapters].sort(),
        completedDays: READING_PLANS[planId].days
          .filter((day) =>
            day.chapters.every((chapter) =>
              chapters.has(`${chapter.book}:${chapter.chapter}`),
            ),
          )
          .map((day) => day.number),
      };
    }
    return parsed.success
      ? {
          ...parsed.data,
          completedDays: [...new Set(parsed.data.completedDays)].sort(
            (a, b) => a - b,
          ),
        }
      : null;
  } catch {
    return null;
  }
}

/** Find the first gap, rather than the highest completed day: flexible pace must
 * not silently skip earlier unfinished activities. Null means all days are done.
 */
export function nextReadingPlanDay(
  progress: ReadingPlanProgress | null,
  planId: ReadingPlanId = "new-testament",
): number | null {
  const completed = new Set(progress?.completedDays);
  for (let day = 1; day <= READING_PLANS[planId].days.length; day++) {
    if (!completed.has(day)) return day;
  }
  return null;
}

/** Re-read before each edit so stale React renders cannot overwrite another
 * day's progress. Persist first, notify second; failed storage never shows a
 * false success. Opening a plan chapter calls this without a day only when
 * starting; it never marks a reading complete.
 */
export function updateReadingPlanProgress(
  day?: number,
  complete = true,
  planId: ReadingPlanId = "new-testament",
): void {
  if (day !== undefined) {
    z.number().int().min(1).max(READING_PLANS[planId].days.length).parse(day);
    if (READING_PLANS[planId].chapterCompletion)
      throw new Error("Mark each assigned chapter instead");
  }
  const current = parseReadingPlanProgress(
    readReadingPlanSnapshot(planId),
    planId,
  );
  const days = new Set(current?.completedDays);
  if (day !== undefined) {
    if (complete) days.add(day);
    else days.delete(day);
  }
  const value = schemas[planId].parse({
    version: 2,
    startedAt: current?.startedAt ?? new Date().toISOString(),
    completedDays: [...days].sort((a, b) => a - b),
    ...(READING_PLANS[planId].chapterCompletion
      ? { completedChapters: current?.completedChapters ?? [] }
      : {}),
  });
  window.localStorage.setItem(KEYS[planId], JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
  notifyReadingPlanParticipation({
    planId,
    operation:
      day === undefined
        ? "start"
        : value.completedDays.length === READING_PLANS[planId].days.length
          ? "complete"
          : "activity",
  });
}

/** Explicit confirmed reset removes only this plan's local record. Notify after
 * removal succeeds so a storage exception cannot falsely clear visible progress.
 */
export function resetReadingPlanProgress(
  planId: ReadingPlanId = "new-testament",
): void {
  window.localStorage.removeItem(KEYS[planId]);
  window.dispatchEvent(new Event(EVENT));
  notifyReadingPlanParticipation({ planId, operation: "reset" });
}

/** Same-tab edits and other-tab storage events refresh UI without polling. */
export function subscribeReadingPlanProgress(
  notify: () => void,
  planId: ReadingPlanId = "new-testament",
): () => void {
  function onStorage(event: StorageEvent): void {
    if (event.key === KEYS[planId] || event.key === null) notify();
  }
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", onStorage);
  };
}

/** Mark/undo one assigned chapter. The whole day completes only after every
 * chapter is explicitly marked. One synchronous local write updates both sets,
 * preserving partial progress across refreshes without any server mutation.
 */
export function updateReadingPlanChapter(
  chapter: PlanChapter,
  complete: boolean,
  planId: ReadingPlanId,
): void {
  const parsed = z
    .object({ book: z.string(), chapter: z.number().int().positive() })
    .parse(chapter);
  const plan = READING_PLANS[planId];
  const assignedDay = plan.days.find((day) =>
    day.chapters.some(
      (item) => item.book === parsed.book && item.chapter === parsed.chapter,
    ),
  );
  if (!assignedDay) throw new Error("Chapter is outside this reading plan");
  if (!plan.chapterCompletion) {
    updateReadingPlanProgress(assignedDay.number, complete, planId);
    return;
  }
  const current = parseReadingPlanProgress(
    readReadingPlanSnapshot(planId),
    planId,
  );
  const completedChapters = new Set(current?.completedChapters);
  const key = `${parsed.book}:${parsed.chapter}`;
  if (complete) completedChapters.add(key);
  else completedChapters.delete(key);
  const completedDays = plan.days
    .filter((day) =>
      day.chapters.every((item) =>
        completedChapters.has(`${item.book}:${item.chapter}`),
      ),
    )
    .map((day) => day.number);
  const value = schemas[planId].parse({
    version: 2,
    startedAt: current?.startedAt ?? new Date().toISOString(),
    completedChapters: [...completedChapters].sort(),
    completedDays,
  });
  window.localStorage.setItem(KEYS[planId], JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
  notifyReadingPlanParticipation({
    planId,
    operation:
      completedDays.length === plan.days.length ? "complete" : "activity",
  });
}
