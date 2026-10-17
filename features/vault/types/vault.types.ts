import type {
  JourneyStage,
  TranslationCode,
} from "@/lib/generated/prisma/enums";

export type VaultVerseItem = {
  verseId: string;
  reference: string;
  translation: TranslationCode;
  text: string | null;
  availableTranslations: TranslationCode[];
  packSlugs: string[];
  packNames: string[];
  isFavorite: boolean;
  hasPersonalNote: boolean;
  studyAccess: "AVAILABLE" | "LOCKED";
  completedStages: JourneyStage[];
};

/** Deduplicated collection sources; text is selected from the saved preference. */
export type VaultLibraryData = {
  completedVerses: VaultVerseItem[];
  masteredVerses: VaultVerseItem[];
  favoriteVerses: VaultVerseItem[];
  inProgressVerses: VaultVerseItem[];
};
