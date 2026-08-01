import type {
  JourneyStage,
  TranslationCode,
  WaypointStatus,
} from "@/lib/generated/prisma/enums";

export type VaultSummary = {
  completedWaypoints: number;
  glowPoints: number;
  currentStreak: number;
  bestStreak: number;
  hintsRemaining: number;
  totalHintsUsed: number;
};

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

export type VaultWaypointItem = {
  waypointId: string;
  number: number;
  reference: string;
  journeyStage: string;
  status: WaypointStatus;
  completedDays: number;
};

export type VaultLibraryData = {
  summary: VaultSummary;
  completedVerses: VaultVerseItem[];
  masteredVerses: VaultVerseItem[];
  favoriteVerses: VaultVerseItem[];
  inProgressWaypoints: VaultWaypointItem[];
  availableTranslations: TranslationCode[];
  packs: Array<{ slug: string; name: string }>;
};
