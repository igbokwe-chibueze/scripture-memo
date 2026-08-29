import type {
  TranslationCode,
  VerseStudySectionType,
} from "@/lib/generated/prisma/enums";

export type VerseWriteData = {
  reference: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  reflection: string | null;
  studySections: Array<{
    type: VerseStudySectionType;
    position: number;
    content: string;
  }>;
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

export type VerseImportRowStatus = "ready" | "duplicate" | "invalid";

export type VerseImportPreviewRow = {
  rowNumber: number;
  reference: string;
  status: VerseImportRowStatus;
  messages: string[];
};

export type VerseImportPreview = {
  rows: VerseImportPreviewRow[];
  readyCount: number;
  duplicateCount: number;
  invalidCount: number;
};

export type VerseImportResult = {
  importedCount: number;
  duplicateCount: number;
  invalidCount: number;
};

export type ParsedVerseImportRow = {
  rowNumber: number;
  data: VerseWriteData;
};
