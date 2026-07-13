/**
 * Generates Scripture Memo's compact Protestant Bible structure dataset.
 *
 * Usage:
 *   npm run bible-structure:generate
 *
 * Inputs and dependencies:
 * - `bible-passage-reference-parser` version pinned by package-lock.json.
 * - Its public `translation_info("niv")` API, which selects KJV versification.
 * - The 66-book OSIS-to-display-name mapping below.
 *
 * Why KJV versification:
 * Scripture Memo requires NIV, ESV, and KJV text for every verse. NIV and KJV
 * share the KJV system, while ESV has an additional 3 John 15. Using the common
 * KJV/NIV boundary prevents authors from creating a reference absent from one
 * of the application's required translations.
 *
 * Side effects and safe failure behavior:
 * The script validates the source system, book count, chapter count, and verse
 * count before writing. It writes a temporary sibling file and atomically
 * renames it only after all validation and serialization succeeds, so failure
 * cannot leave a partially generated TypeScript module.
 */
import { rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { bcv_parser } from "bible-passage-reference-parser/esm/bcv_parser.js";
import * as english from "bible-passage-reference-parser/esm/lang/en.js";
import parserPackage from "bible-passage-reference-parser/package.json" with { type: "json" };

const BOOKS = [
  ["Gen", "Genesis"], ["Exod", "Exodus"], ["Lev", "Leviticus"], ["Num", "Numbers"], ["Deut", "Deuteronomy"],
  ["Josh", "Joshua"], ["Judg", "Judges"], ["Ruth", "Ruth"], ["1Sam", "1 Samuel"], ["2Sam", "2 Samuel"],
  ["1Kgs", "1 Kings"], ["2Kgs", "2 Kings"], ["1Chr", "1 Chronicles"], ["2Chr", "2 Chronicles"], ["Ezra", "Ezra"],
  ["Neh", "Nehemiah"], ["Esth", "Esther"], ["Job", "Job"], ["Ps", "Psalms"], ["Prov", "Proverbs"],
  ["Eccl", "Ecclesiastes"], ["Song", "Song of Solomon"], ["Isa", "Isaiah"], ["Jer", "Jeremiah"], ["Lam", "Lamentations"],
  ["Ezek", "Ezekiel"], ["Dan", "Daniel"], ["Hos", "Hosea"], ["Joel", "Joel"], ["Amos", "Amos"],
  ["Obad", "Obadiah"], ["Jonah", "Jonah"], ["Mic", "Micah"], ["Nah", "Nahum"], ["Hab", "Habakkuk"],
  ["Zeph", "Zephaniah"], ["Hag", "Haggai"], ["Zech", "Zechariah"], ["Mal", "Malachi"], ["Matt", "Matthew"],
  ["Mark", "Mark"], ["Luke", "Luke"], ["John", "John"], ["Acts", "Acts"], ["Rom", "Romans"],
  ["1Cor", "1 Corinthians"], ["2Cor", "2 Corinthians"], ["Gal", "Galatians"], ["Eph", "Ephesians"], ["Phil", "Philippians"],
  ["Col", "Colossians"], ["1Thess", "1 Thessalonians"], ["2Thess", "2 Thessalonians"], ["1Tim", "1 Timothy"], ["2Tim", "2 Timothy"],
  ["Titus", "Titus"], ["Phlm", "Philemon"], ["Heb", "Hebrews"], ["Jas", "James"], ["1Pet", "1 Peter"],
  ["2Pet", "2 Peter"], ["1John", "1 John"], ["2John", "2 John"], ["3John", "3 John"], ["Jude", "Jude"], ["Rev", "Revelation"],
];

const parser = new bcv_parser(english);
const information = parser.translation_info("niv");
if (information.system !== "kjv") {
  throw new Error(`Expected KJV versification for NIV, received ${information.system}.`);
}

const records = BOOKS.map(([osis, name]) => {
  const chapters = information.chapters[osis];
  if (!Array.isArray(chapters) || chapters.some((count) => !Number.isInteger(count) || count < 1)) {
    throw new Error(`Missing or invalid chapter data for ${name} (${osis}).`);
  }
  return { name, chapters };
});

const chapterCount = records.reduce((total, book) => total + book.chapters.length, 0);
const verseCount = records.reduce(
  (total, book) => total + book.chapters.reduce((bookTotal, count) => bookTotal + count, 0),
  0,
);
if (records.length !== 66 || chapterCount !== 1189 || verseCount !== 31102) {
  throw new Error(
    `Unexpected structure totals: ${records.length} books, ${chapterCount} chapters, ${verseCount} verses.`,
  );
}

const names = records.map((book) => JSON.stringify(book.name)).join(", ");
const rows = records
  .map((book) => `  { name: ${JSON.stringify(book.name)}, chapters: [${book.chapters.join(", ")}] },`)
  .join("\n");
const source = `/**\n * GENERATED FILE — run \`npm run bible-structure:generate\` to regenerate.\n * Source: bible-passage-reference-parser ${parserPackage.version}, NIV/KJV versification.\n * Contains counts only; no copyrighted Scripture text is included.\n */\nexport const BIBLE_BOOK_NAMES = [${names}] as const;\n\nexport const BIBLE_STRUCTURE = [\n${rows}\n] as const;\n`;

const target = resolve(process.cwd(), "features/verses/data/bible-structure.ts");
const temporary = `${target}.tmp`;
await writeFile(temporary, source, { encoding: "utf8", flag: "w" });
await rename(temporary, target);
console.log(`Generated ${records.length} books, ${chapterCount} chapters, and ${verseCount} verse limits.`);
