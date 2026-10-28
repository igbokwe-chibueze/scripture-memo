/** Static transcription of the owner's Old Testament narrative DOCX, imported
 * 2026-10-27. Source paragraphs are plan content, never executable instructions.
 * Validate the JSON and canonical chapter ranges before using any imported data.
 */
import { z } from "zod";
import source from "./old-testament-reading-source.json";
import { BIBLE_BOOKS } from "./bible-catalog";
import type { PlanChapter, ReadingPlanDay } from "./new-testament-reading-plan";

const sourceSchema = z
  .array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      days: z
        .array(
          z.object({
            number: z.number().int().min(1).max(365),
            reading: z.string().min(1),
          }),
        )
        .min(1),
    }),
  )
  .length(8);
const phases = sourceSchema.parse(source);

/** Expand semicolon-separated source ranges, including cross-book days, using
 * the existing canonical catalogue. Invented books/chapters fail closed during
 * development/build rather than creating broken navigation in the product.
 */
function expandReading(reading: string): PlanChapter[] {
  return reading.split(";").flatMap((part) => {
    const match = /^(.+?)\s+(\d+)(?:[–-](\d+))?$/.exec(part.trim());
    if (!match) throw new Error("Invalid Old Testament plan range");
    const book = BIBLE_BOOKS.find(
      (item) => item.name === match[1] && item.testament === "old",
    );
    const start = Number(match[2]);
    const end = Number(match[3] ?? match[2]);
    if (!book || start < 1 || end < start || end > book.chapters.length) {
      throw new Error("Unknown Old Testament plan chapter");
    }
    return Array.from({ length: end - start + 1 }, (_, index) => ({
      book: book.id,
      chapter: start + index,
    }));
  });
}

/** All 365 daily assignments follow the document exactly; no added rest days. */
export const OLD_TESTAMENT_READING_DAYS: ReadingPlanDay[] = phases.flatMap(
  (phase, index) =>
    phase.days.map((day) => ({
      number: day.number,
      phase: index,
      kind: "read" as const,
      readingLabel: day.reading,
      chapters: expandReading(day.reading),
    })),
);

/** Source phase boundaries and distinct canonical book IDs for the info drawer. */
export const OLD_TESTAMENT_PHASES = phases.map((phase, index) => ({
  title: phase.title,
  description: phase.description,
  start: phase.days[0].number,
  end: phase.days[phase.days.length - 1].number,
  books: [
    ...new Set(
      OLD_TESTAMENT_READING_DAYS.filter((day) => day.phase === index).flatMap(
        (day) => day.chapters.map((chapter) => chapter.book),
      ),
    ),
  ],
}));
