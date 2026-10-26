/** Device-only plan progress. No account data, timers, server actions or DB work.
 * The versioned key isolates this immutable schedule from future plan revisions.
 */
import { z } from "zod";

const KEY = "scripture-memo:reading-plan:nt-365:v1";
const EVENT = "scripture-memo:reading-plan-change";
const daySchema = z.number().int().min(1).max(365);
const progressSchema = z.object({
  version: z.literal(1),
  startedAt: z.string().datetime(),
  completedDays: z.array(daySchema).max(365),
});
/** Only explicit starting/completing/undoing writes this small local record. */
export type ReadingPlanProgress = z.infer<typeof progressSchema>;

/** Primitive snapshots are stable for useSyncExternalStore and SSR-safe. */
export function readReadingPlanSnapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/** Treat invalid or old browser data as unstarted; never render unchecked JSON. */
export function parseReadingPlanProgress(
  snapshot: string,
): ReadingPlanProgress | null {
  try {
    const value: unknown = JSON.parse(snapshot);
    const parsed = progressSchema.safeParse(value);
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
 * not silently skip earlier unfinished activities. Null means all 365 are done.
 */
export function nextReadingPlanDay(
  progress: ReadingPlanProgress | null,
): number | null {
  const completed = new Set(progress?.completedDays);
  for (let day = 1; day <= 365; day++) {
    if (!completed.has(day)) return day;
  }
  return null;
}

/** Re-read before each edit so stale React renders cannot overwrite another
 * day's progress. Persist first, notify second; failed storage never shows a
 * false success. Opening a chapter never calls this function.
 */
export function updateReadingPlanProgress(day?: number, complete = true): void {
  if (day !== undefined) daySchema.parse(day);
  const current = parseReadingPlanProgress(readReadingPlanSnapshot());
  const days = new Set(current?.completedDays);
  if (day !== undefined) {
    if (complete) days.add(day);
    else days.delete(day);
  }
  const value = progressSchema.parse({
    version: 1,
    startedAt: current?.startedAt ?? new Date().toISOString(),
    completedDays: [...days].sort((a, b) => a - b),
  });
  window.localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(EVENT));
}

/** Same-tab edits and other-tab storage events refresh UI without polling. */
export function subscribeReadingPlanProgress(notify: () => void): () => void {
  function onStorage(event: StorageEvent): void {
    if (event.key === KEY || event.key === null) notify();
  }
  window.addEventListener(EVENT, notify);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, notify);
    window.removeEventListener("storage", onStorage);
  };
}
