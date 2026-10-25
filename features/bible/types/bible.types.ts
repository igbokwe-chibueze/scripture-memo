/** Provider-independent, serializable Bible presentation contracts. */
import type { BibleReference } from "../schemas/bible.schema";

export type BibleVerse = {
  number: number;
  text: string;
  heading?: string;
  footnotes: string[];
};
export type BibleChapter = {
  verses: BibleVerse[];
  audio: Record<string, string>;
  source: { name: string; website: string; licenseUrl: string };
};
export type BibleMark = BibleReference & {
  bookmarked: boolean;
  highlight: string | null;
};
export type BibleSearchHit = BibleReference & { text: string };
export type BibleWord = {
  pos: number;
  text: string;
  language: string;
  transliteration: string;
  strongs: string;
  gloss: string;
  parsingFull: string;
};
export type BibleStudy = {
  words?: BibleWord[];
  commentary?: {
    introduction?: string;
    entries: { verse: number; text: string }[];
  };
  references?: {
    book: string;
    chapter: number;
    verse: number;
    endVerse?: number;
  }[];
  source: {
    name: string;
    website: string;
    licenseUrl: string;
    licenseNotes?: string;
  };
};
export type BibleLexicon = {
  senses: {
    id: string;
    language: string;
    lemma: string;
    transliteration: string;
    gloss: string;
    definition: string;
    partOfSpeech: string;
  }[];
};
