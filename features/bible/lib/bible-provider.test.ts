/** Provider contract regressions use synthetic JSON, not network/database calls.
 * Run with the react-server export condition so server-only remains enforced.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  loadBibleChapter,
  loadBibleStudy,
  searchBibleText,
} from "./bible-provider";

const source = {
  name: "Fixture source",
  website: "https://example.test/",
  licenseUrl: "https://example.test/license",
  licenseNotes: null,
};
const reference = {
  book: "GEN",
  chapter: 1,
  verse: 3,
  translation: "BSB" as const,
};

test("provider preserves heading/footnotes and rejects unsafe audio URLs", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      translation: source,
      chapter: {
        content: [
          { type: "heading", text: "Creation" },
          {
            type: "verse",
            number: 3,
            text: "Let there be light.",
            footnotes: [{ text: "A source note." }],
          },
        ],
      },
      thisChapterAudioLinks: {
        safe: "https://audio.bible.helloao.org/api/audio.mp3",
        unsafe: "javascript:alert(1)",
        foreign: "https://unapproved.example/audio.mp3",
      },
    });
  try {
    const chapter = await loadBibleChapter(reference);
    assert.equal(chapter.verses[0].heading, "Creation");
    assert.deepEqual(chapter.verses[0].footnotes, ["A source note."]);
    assert.deepEqual(Object.keys(chapter.audio), ["safe"]);
  } finally {
    globalThis.fetch = original;
  }
});

test("null optional metadata never hides an otherwise valid word study", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      dataset: source,
      chapter: {
        content: [
          {
            verse: 3,
            words: [
              {
                pos: 1,
                text: "אוֹר",
                language: "hebrew",
                transliteration: null,
                strongs: null,
                gloss: null,
                parsingFull: null,
              },
            ],
          },
        ],
      },
    });
  try {
    const study = await loadBibleStudy(reference, "words", "matthew-henry");
    assert.equal(study?.words?.[0].text, "אוֹר");
    assert.equal(study?.words?.[0].strongs, "");
    assert.equal(study?.source.licenseNotes, undefined);
  } finally {
    globalThis.fetch = original;
  }
});

test("missing commentary stays empty rather than borrowing another verse's entry", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({
      commentary: source,
      chapter: {
        content: [
          { type: "verse", number: 1, content: ["Notes on verse one."] },
        ],
      },
    });
  try {
    assert.equal(
      (await loadBibleStudy(reference, "commentary", "matthew-henry"))
        ?.commentary,
      "",
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("full-text index deduplicates concurrent loads and paginates literal matches", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return Response.json({
      books: [
        {
          id: "GEN",
          chapters: [
            {
              chapter: {
                number: 1,
                content: Array.from({ length: 25 }, (_, index) => ({
                  type: "verse",
                  number: index + 1,
                  text: "A light in the darkness.",
                })),
              },
            },
          ],
        },
      ],
    });
  };
  try {
    const [first, second] = await Promise.all([
      searchBibleText("LIGHT", "BSB", 1),
      searchBibleText("light", "BSB", 2),
    ]);
    assert.equal(calls, 1);
    assert.equal(first.total, 25);
    assert.equal(first.hits.length, 20);
    assert.equal(second.hits.length, 5);
    assert.equal(second.hits[0].verse, 21);
    assert.equal(
      (await searchBibleText(".*", "BSB", 1)).total,
      0,
      "Search treats regex characters literally.",
    );
  } finally {
    globalThis.fetch = original;
  }
});
