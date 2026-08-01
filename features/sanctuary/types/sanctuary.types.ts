import type { TranslationCode } from "@/lib/generated/prisma/enums";

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
