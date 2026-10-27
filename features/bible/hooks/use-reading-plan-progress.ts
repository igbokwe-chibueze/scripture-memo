"use client";

/** One event-driven local store shared by discovery, plan and reader controls. */
import { useCallback, useSyncExternalStore } from "react";
import type { ReadingPlanId } from "../data/reading-plan-catalog";
import {
  parseReadingPlanProgress,
  readReadingPlanSnapshot,
  subscribeReadingPlanProgress,
  type ReadingPlanProgress,
} from "../lib/reading-plan-progress";

/** Server HTML starts unstarted; hydration reads this browser's saved progress. */
export function useReadingPlanProgress(
  planId: ReadingPlanId = "new-testament",
): ReadingPlanProgress | null {
  const subscribe = useCallback(
    (notify: () => void) => subscribeReadingPlanProgress(notify, planId),
    [planId],
  );
  const read = useCallback(() => readReadingPlanSnapshot(planId), [planId]);
  const snapshot = useSyncExternalStore(subscribe, read, () => "");
  return parseReadingPlanProgress(snapshot, planId);
}
