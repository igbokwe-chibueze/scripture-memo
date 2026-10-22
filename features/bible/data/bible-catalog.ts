/** Provider IDs are fixed locally: remote/user URLs never become server fetch targets. */
import { BIBLE_STRUCTURE } from "@/features/verses/data/bible-structure";

const ids =
  "GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV".split(
    " ",
  );

/** Canonical 66-book navigation; counts contain no copyrighted Bible text. */
export const BIBLE_BOOKS = BIBLE_STRUCTURE.map((book, index) => ({
  id: ids[index],
  name: book.name,
  chapters: book.chapters as readonly number[],
  testament: index < 39 ? "old" : "new",
  group:
    index < 5
      ? "pentateuch"
      : index < 17
        ? "history"
        : index < 22
          ? "wisdom"
          : index < 27
            ? "majorProphets"
            : index < 39
              ? "minorProphets"
              : index < 43
                ? "gospels"
                : index === 43
                  ? "history"
                  : index < 57
                    ? "paul"
                    : index < 65
                      ? "letters"
                      : "prophecy",
}));

/** Only the three owner-approved translations are available in this reader. */
export const BIBLE_TRANSLATIONS = {
  KJV: "eng_kjv",
  WEB: "ENGWEBP",
  BSB: "BSB",
} as const;

/** Curated navigation topics link to actual passages, never generated Scripture. */
export const BIBLE_TOPICS = [
  {
    id: "faith",
    passages: [
      { book: "HEB", chapter: 11, verse: 1 },
      { book: "PRO", chapter: 3, verse: 5 },
      { book: "PSA", chapter: 46, verse: 1 },
    ],
  },
  {
    id: "peace",
    passages: [
      { book: "JHN", chapter: 14, verse: 27 },
      { book: "PHP", chapter: 4, verse: 6 },
      { book: "PSA", chapter: 23, verse: 1 },
    ],
  },
  {
    id: "love",
    passages: [
      { book: "1CO", chapter: 13, verse: 4 },
      { book: "JHN", chapter: 3, verse: 16 },
      { book: "1JN", chapter: 4, verse: 7 },
    ],
  },
  {
    id: "wisdom",
    passages: [
      { book: "JAS", chapter: 1, verse: 5 },
      { book: "PRO", chapter: 2, verse: 6 },
      { book: "PSA", chapter: 119, verse: 105 },
    ],
  },
] as const;
