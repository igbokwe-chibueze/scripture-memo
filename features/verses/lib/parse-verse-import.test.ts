import assert from "node:assert/strict";
import test from "node:test";
import { VERSE_IMPORT_HEADERS } from "@/features/verses/constants/verse-import";
import { prepareVerseImport } from "@/features/verses/lib/parse-verse-import";

/**
 * Converts one import fixture into a standards-compliant CSV row. Keeping this
 * escaping in the test protects examples containing commas, quotes, or line
 * breaks without coupling the production parser to a test-only CSV writer.
 */
function createCsvRow(values: Record<string, string>): string {
  return VERSE_IMPORT_HEADERS.map((header) => {
    const value = values[header] ?? "";
    const escapedValue = value.replaceAll('"', '""');
    return /[",\r\n]/u.test(value) ? `"${escapedValue}"` : escapedValue;
  }).join(",");
}

/** Builds a complete file using the exact downloadable-template header order. */
function createCsv(values: Record<string, string>): string {
  return `${VERSE_IMPORT_HEADERS.join(",")}\r\n${createCsvRow(values)}\r\n`;
}

test("accepts a draft with only canonical location fields and KJV", () => {
  const prepared = prepareVerseImport(
    createCsv({
      book: "John",
      chapter: "3",
      verseStart: "16",
      KJV: "For God so loved the world",
    }),
    [],
  );

  assert.equal(prepared.preview.readyCount, 1);
  assert.equal(prepared.preview.invalidCount, 0);
  assert.equal(prepared.readyRows[0]?.data.isActive, false);
  assert.deepEqual(prepared.readyRows[0]?.data.studySections, []);
  assert.equal(prepared.readyRows[0]?.data.translations.WEB, "");
});

test("maps structured study columns to their individual Sanctuary sections", () => {
  const prepared = prepareVerseImport(
    createCsv({
      book: "Psalms",
      chapter: "23",
      verseStart: "1",
      KJV: "The LORD is my shepherd; I shall not want.",
      bookBackground: "Davidic shepherd imagery.",
      prayer: "Lord, teach me to trust your care.",
      tags: "trust, shepherd",
      isActive: "true",
    }),
    [],
  );

  const imported = prepared.readyRows[0]?.data;
  assert.equal(imported?.isActive, true);
  assert.deepEqual(imported?.tags, ["trust", "shepherd"]);
  assert.deepEqual(
    imported?.studySections.map((section) => section.type),
    ["BOOK_BACKGROUND", "PRAYER"],
  );
});

test("rejects a row that omits the minimum KJV translation", () => {
  const prepared = prepareVerseImport(
    createCsv({
      book: "Romans",
      chapter: "8",
      verseStart: "28",
      WEB: "We know that all things work together for good",
    }),
    [],
  );

  assert.equal(prepared.preview.readyCount, 0);
  assert.equal(prepared.preview.invalidCount, 1);
  assert.match(
    prepared.preview.rows[0]?.messages.join(" ") ?? "",
    /Translation text is required/u,
  );
});
