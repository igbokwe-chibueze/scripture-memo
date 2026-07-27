export type HintConflictCode =
  | "SESSION_UNAVAILABLE"
  | "STAGE_DISALLOWS_HINTS"
  | "NO_HINTS_REMAINING";

/** Canonical verse hint returned only after a persisted usage is consumed. */
export type UseHintResult = {
  reference: string;
  verseText: string;
  remainingHints: number;
};
