/** Owner-supplied “The New Testament in One Year” DOCX, imported 2026-10-26.
 * Only the schedule and prompts are transcribed; document text is not executable
 * instruction. Owner revision: six consecutive chapter readings followed by
 * one rest day, shortening the plan while preserving chapter order.
 */
import { BIBLE_BOOKS } from "./bible-catalog";

/** Translation-independent chapter location; the reader supplies its edition. */
export type PlanChapter = { book: string; chapter: number };
/** All scheduled days count toward completion, including manual rest days. */
export type ReadingPlanDay = {
  number: number;
  phase: number;
  kind: "read" | "rest";
  chapters: PlanChapter[];
  /** Multi-chapter plans preserve the source's human-readable daily range. */
  readingLabel?: string;
};

/** Original chapter grouping, independent of how many rest days are scheduled. */
const PHASE_BOOKS = [
  ["MRK", "JHN", "LUK"],
  ["ACT"],
  ["EPH", "GAL", "JAS", "1JN"],
  ["MAT", "PHP", "COL", "1TH", "2TH"],
  ["ROM", "1CO", "2CO", "1PE", "2PE", "JUD"],
  ["PHM", "1TI", "2TI", "TIT", "2JN", "3JN", "HEB"],
  ["REV"],
] as const;

/** Build chapters once from canonical counts. The phase stays attached to each
 * chapter, so crossing phases cannot restart the six-read/one-rest cadence.
 */
const PLAN_CHAPTERS = PHASE_BOOKS.flatMap((books, phase) =>
  books.flatMap((id) => {
    const book = BIBLE_BOOKS.find((item) => item.id === id);
    if (!book) throw new Error("Unknown reading-plan book");
    return book.chapters.map((_, index) => ({
      book: id,
      chapter: index + 1,
      phase,
    }));
  }),
);

/** Generate only until the final chapter is read. There is no trailing filler
 * rest day: 260 readings plus 43 seventh-day rests produces 303 total days.
 * This static client data performs no requests and awards no game rewards.
 */
function buildSchedule(): ReadingPlanDay[] {
  const days: ReadingPlanDay[] = [];
  let cursor = 0;
  while (cursor < PLAN_CHAPTERS.length) {
    const number = days.length + 1;
    if (number % 7 === 0) {
      days.push({
        number,
        phase: days[days.length - 1].phase,
        kind: "rest",
        chapters: [],
      });
    } else {
      const { phase, ...chapter } = PLAN_CHAPTERS[cursor++];
      days.push({ number, phase, kind: "read", chapters: [chapter] });
    }
  }
  return days;
}

/** Exactly 260 chapters and 43 rest days in the owner's shortened plan. */
export const NEW_TESTAMENT_READING_DAYS = buildSchedule();

/** Single denominator for storage validation, progress bars and localized copy. */
export const NEW_TESTAMENT_PLAN_DAY_COUNT = NEW_TESTAMENT_READING_DAYS.length;

/** Derive phase ranges from actual scheduled days, including any rest immediately
 * after a phase's last chapter. No stale hand-maintained calendar boundaries.
 */
export const NEW_TESTAMENT_PHASES = PHASE_BOOKS.map((books, phase) => {
  const days = NEW_TESTAMENT_READING_DAYS.filter((day) => day.phase === phase);
  return { books, start: days[0].number, end: days[days.length - 1].number };
});
