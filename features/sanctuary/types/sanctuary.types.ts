import type { TranslationCode } from "@/lib/generated/prisma/enums";
import type { StudyAccessState } from "@/features/sanctuary/lib/study-access";

/** Private, learner-authorized data rendered by one Sanctuary page. */
export type SanctuaryData = {
  verseId: string;
  reference: string;
  translation: TranslationCode;
  verseText: string;
  reflection: string | null;
  studyNote: string | null;
  personalNote: string;
  isFavorite: boolean;
};

/** Distinguishes a temporary practice lock from an unauthorized verse URL. */
export type SanctuaryReadResult =
  | { status: "available"; access: Exclude<StudyAccessState, "LOCKED" | "UNAVAILABLE">; data: SanctuaryData }
  | { status: "locked"; verseId: string; reference: string };
