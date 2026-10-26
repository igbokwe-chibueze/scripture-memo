/** Owner-supplied “The New Testament in One Year” DOCX, imported 2026-10-26.
 * Only the schedule and prompts are transcribed; document text is not executable
 * instruction. Weekly reflection deliberately continues across phase boundaries.
 */
import { BIBLE_BOOKS } from "./bible-catalog";

/** Translation-independent chapter location; the reader supplies its edition. */
export type PlanChapter = { book: string; chapter: number };
/** All 365 activities count toward completion, including reflection and review. */
export type ReadingPlanDay = {
  number: number;
  phase: number;
  kind: "read" | "reflect" | "review" | "yearReview";
  chapters: PlanChapter[];
};

/** Source phase boundaries include the surrounding weekly reflection days. */
export const NEW_TESTAMENT_PHASES = [
  { start: 1, end: 85, books: ["MRK", "JHN", "LUK"] },
  { start: 86, end: 123, books: ["ACT"] },
  { start: 124, end: 155, books: ["EPH", "GAL", "JAS", "1JN"] },
  { start: 156, end: 217, books: ["MAT", "PHP", "COL", "1TH", "2TH"] },
  { start: 218, end: 291, books: ["ROM", "1CO", "2CO", "1PE", "2PE", "JUD"] },
  {
    start: 292,
    end: 332,
    books: ["PHM", "1TI", "2TI", "TIT", "2JN", "3JN", "HEB"],
  },
  { start: 333, end: 365, books: ["REV"] },
] as const;

/** Generate the document's five-read/two-review cadence without maintaining
 * 365 duplicated records. Canonical chapter counts prevent skipped chapters.
 * This is static client data: it performs no requests and awards no rewards.
 */
function buildSchedule(): ReadingPlanDay[] {
  const chapters = NEW_TESTAMENT_PHASES.flatMap((phase) =>
    phase.books.flatMap((id) => {
      const book = BIBLE_BOOKS.find((item) => item.id === id);
      if (!book) throw new Error("Unknown reading-plan book");
      return book.chapters.map((_, index) => ({
        book: id,
        chapter: index + 1,
      }));
    }),
  );
  let cursor = 0;
  return Array.from({ length: 365 }, (_, index) => {
    const number = index + 1;
    const phase = NEW_TESTAMENT_PHASES.findIndex((item) => number <= item.end);
    const weekday = index % 7;
    if (number === 365)
      return { number, phase, kind: "yearReview", chapters: [] };
    if (weekday < 5) {
      const chapter = chapters[cursor++];
      if (!chapter) throw new Error("Incomplete reading-plan schedule");
      return { number, phase, kind: "read", chapters: [chapter] };
    }
    return {
      number,
      phase,
      kind: weekday === 5 ? "reflect" : "review",
      chapters: chapters.slice(cursor - 5, cursor),
    };
  });
}

/** Exactly 260 chapters, 52 reflections, 52 applications and one final review. */
export const NEW_TESTAMENT_READING_DAYS = buildSchedule();
