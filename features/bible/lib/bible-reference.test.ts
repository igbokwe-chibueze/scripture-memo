/** Pure navigation/validation regression checks; no external API or database. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  adjacentBibleChapter,
  bibleReferenceUrl,
  bibleSelectionFromQuery,
  bibleSelectionLabel,
} from "./bible-reference";
import {
  bibleMarkSchema,
  bibleReferenceSchema,
  bibleStudySchema,
  biblePassageSaveSchema,
} from "../schemas/bible.schema";

const reference = {
  book: "GEN",
  chapter: 1,
  verse: 1,
  translation: "KJV" as const,
};

test("chapter and arbitrary verse-set links retain canonical selections", () => {
  const selected = biblePassageSaveSchema.parse({
    ...reference,
    selection: [18, 16, 17, 16, 21],
    saved: true,
  });
  assert.deepEqual(selected.selection, [16, 17, 18, 21]);
  assert.equal(bibleSelectionLabel(selected), "Genesis 1:16–18, 21");
  const url = new URL(bibleReferenceUrl(selected), "https://example.test");
  assert.deepEqual(
    bibleSelectionFromQuery(url.searchParams.get("selection")),
    selected.selection,
  );
  assert.equal(bibleSelectionFromQuery("../secret"), null);
  assert.equal(bibleSelectionFromQuery(""), null);
  assert.equal(
    biblePassageSaveSchema.safeParse({
      ...reference,
      selection: [],
      saved: true,
    }).success,
    false,
  );
  assert.equal(
    biblePassageSaveSchema.safeParse({
      ...reference,
      selection: [32],
      saved: true,
    }).success,
    false,
  );
  assert.equal(
    bibleReferenceSchema.safeParse({ ...reference, selection: [0] }).success,
    false,
  );
  assert.equal(
    new URL(
      bibleReferenceUrl({ ...reference, selection: "chapter" }),
      "https://example.test",
    ).searchParams.get("selection"),
    "chapter",
  );
  assert.equal(
    adjacentBibleChapter({ ...reference, selection: [1, 3] }, 1)?.selection,
    undefined,
  );
});

test("Bible navigation crosses books and stops at canon boundaries", () => {
  assert.equal(adjacentBibleChapter(reference, -1), null);
  assert.deepEqual(adjacentBibleChapter({ ...reference, chapter: 50 }, 1), {
    ...reference,
    book: "EXO",
  });
  assert.deepEqual(adjacentBibleChapter({ ...reference, book: "EXO" }, -1), {
    ...reference,
    chapter: 50,
  });
  assert.equal(
    adjacentBibleChapter({ ...reference, book: "REV", chapter: 22 }, 1),
    null,
  );
});

test("references reject invented verses and arbitrary provider path injection", () => {
  for (const invalid of [
    { ...reference, book: "../secret" },
    { ...reference, chapter: 51 },
    { ...reference, verse: 32 },
    { ...reference, translation: "NIV" },
  ]) {
    assert.equal(bibleReferenceSchema.safeParse(invalid).success, false);
  }
  assert.equal(
    bibleReferenceSchema.safeParse({
      ...reference,
      book: "PSA",
      chapter: 119,
      verse: 176,
    }).success,
    true,
  );
  assert.equal(
    bibleMarkSchema.safeParse({ ...reference, operation: "bookmark" }).success,
    false,
  );
  assert.equal(
    bibleMarkSchema.safeParse({
      ...reference,
      operation: "highlight",
      highlight: null,
    }).success,
    true,
  );
  assert.equal(
    bibleStudySchema.safeParse({
      ...reference,
      tab: "commentary",
      commentary: "../../secret",
    }).success,
    false,
  );
});

test("shared links preserve exact reference and translation", () => {
  const url = new URL(
    bibleReferenceUrl({ ...reference, verse: 3, translation: "WEB" }),
    "https://example.test",
  );
  assert.equal(url.pathname, "/bible");
  assert.equal(url.searchParams.get("verse"), "3");
  assert.equal(url.searchParams.get("translation"), "WEB");
});
