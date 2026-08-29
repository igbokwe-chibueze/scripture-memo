import type { JourneyStage } from "@/lib/generated/prisma/enums";

/** One validated Scripture record generated from the approved workbook. */
export type CurriculumVerseData = {
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  tags: string[];
  translations: Record<"KJV" | "WEB" | "BSB", string>;
  reflection: string | null;
  studyNote: string | null;
  isActive: boolean;
};

/** One permanent curriculum assignment generated from the approved workbook. */
export type CurriculumWaypointData = {
  number: number;
  reference: string;
  journeyStage: JourneyStage;
  isActive: boolean;
};

/** Complete generated curriculum contract consumed by seed and reset tools. */
export type CurriculumData = {
  schemaVersion: number;
  source: {
    workbook: string;
    studyGuide: string;
  };
  verses: CurriculumVerseData[];
  waypoints: CurriculumWaypointData[];
};
