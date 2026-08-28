import type {
  TranslationCode,
  VerseStudySectionType,
} from "@/lib/generated/prisma/enums";
import type { StudyAccessState } from "@/features/sanctuary/lib/study-access";

/** Private, learner-authorized data rendered by one Sanctuary page. */
export type SanctuaryData = {
  verseId: string;
  reference: string;
  translation: TranslationCode;
  verseText: string;
  reflection: string | null;
  tags: string[];
  studySections: Array<{
    type: VerseStudySectionType;
    position: number;
    content: string;
  }>;
  personalNote: string;
  isFavorite: boolean;
};

/** Distinguishes a temporary practice lock from an unauthorized verse URL. */
export type SanctuaryReadResult =
  | { status: "available"; access: Exclude<StudyAccessState, "LOCKED" | "UNAVAILABLE">; data: SanctuaryData }
  | { status: "locked"; verseId: string; reference: string };
