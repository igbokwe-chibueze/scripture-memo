"use client";

/** One event-driven local store shared by discovery, plan and reader controls. */
import { useSyncExternalStore } from "react";
import {
  parseReadingPlanProgress,
  readReadingPlanSnapshot,
  subscribeReadingPlanProgress,
  type ReadingPlanProgress,
} from "../lib/reading-plan-progress";

/** Server HTML starts unstarted; hydration reads this browser's saved progress. */
export function useReadingPlanProgress(): ReadingPlanProgress | null {
  const snapshot = useSyncExternalStore(
    subscribeReadingPlanProgress,
    readReadingPlanSnapshot,
    () => "",
  );
  return parseReadingPlanProgress(snapshot);
}
