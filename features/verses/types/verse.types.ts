import type { TranslationCode } from "@/lib/generated/prisma/enums";

export type VerseWriteData = {
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  reflection: string | null;
  studyNote: string | null;
  tags: string[];
  isActive: boolean;
  translations: Record<TranslationCode, string>;
};

export type VerseListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  book?: string;
  tag?: string;
  active?: boolean;
  sort?: "book-asc" | "book-desc";
};
