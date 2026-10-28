/** Readability regressions use synthetic source text; no API or DB is needed. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  parseCommentaryText,
  type CommentaryTextBlock,
} from "./parse-commentary-text";

/** Flatten in reading order to prove formatting never rewrites source wording. */
function readingText(blocks: CommentaryTextBlock[]): string {
  return blocks
    .map((block) =>
      block.type === "paragraph"
        ? block.text
        : block.items
            .map((item) => `${item.marker} ${readingText(item.blocks)}`)
            .join(" "),
    )
    .join(" ");
}

test("source line breaks become distinct paragraphs, including CRLF", () => {
  assert.deepEqual(
    parseCommentaryText(
      "First paragraph.\r\nSecond paragraph.\r\n\r\nThird paragraph.",
    ),
    [
      { type: "paragraph", text: "First paragraph." },
      { type: "paragraph", text: "Second paragraph." },
      { type: "paragraph", text: "Third paragraph." },
    ],
  );
});

test("Roman, decimal and inline subpoints retain their source hierarchy and indexes", () => {
  const source =
    "I. Overview\n1. First point (1.) A detail [1.] One observation [3.] Another observation\n(2.) Second detail\n2. Second point\nII. Conclusion";
  const blocks = parseCommentaryText(source);
  const roman = blocks[0];
  assert.equal(roman.type, "list");
  if (roman.type !== "list") return;
  assert.deepEqual(
    roman.items.map((item) => item.marker),
    ["I.", "II."],
  );
  const decimal = roman.items[0].blocks[1];
  assert.equal(decimal.type, "list");
  if (decimal.type !== "list") return;
  assert.deepEqual(
    decimal.items.map((item) => item.marker),
    ["1.", "2."],
  );
  const parenthesized = decimal.items[0].blocks[1];
  assert.equal(parenthesized.type, "list");
  if (parenthesized.type !== "list") return;
  assert.deepEqual(
    parenthesized.items.map((item) => item.marker),
    ["(1.)", "(2.)"],
  );
  const bracketed = parenthesized.items[0].blocks[1];
  assert.equal(bracketed.type, "list");
  if (bracketed.type !== "list") return;
  assert.deepEqual(
    bracketed.items.map((item) => item.marker),
    ["[1.]", "[3.]"],
  );
  assert.equal(readingText(blocks), source.replace(/\s+/g, " "));
});

test("Bible citations, decimals, abbreviations and ordinary footnotes stay prose", () => {
  const source =
    "See John 3:16, Gen. 1:1, 1.5 measures, note (a), and reference [1]. E.g. this remains one paragraph.";
  assert.deepEqual(parseCommentaryText(source), [
    { type: "paragraph", text: source },
  ]);
});

test("source indentation does not accidentally end a nested outline", () => {
  const blocks = parseCommentaryText(
    "1. Parent\n  (1.) Child\n    [1.] Detail",
  );
  assert.equal(blocks.length, 1);
  const parent = blocks[0];
  assert.equal(parent.type, "list");
  if (parent.type !== "list") return;
  const child = parent.items[0].blocks[1];
  assert.equal(child.type, "list");
  if (child.type !== "list") return;
  assert.equal(child.items[0].blocks[1].type, "list");
});

test("blank lines end an outline and preserve following independent paragraphs", () => {
  const blocks = parseCommentaryText(
    "1. First point\nA continued paragraph.\n\nA separate conclusion.",
  );
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "list");
  assert.deepEqual(blocks[1], {
    type: "paragraph",
    text: "A separate conclusion.",
  });
});

test("standalone lists and Unicode text keep their original words and markers", () => {
  const source =
    "3. An existing index\n5. A skipped index\n\n- A bullet\n- Another bullet\n\n\u05d0\u05d5\u05e8 means light.";
  const blocks = parseCommentaryText(source);
  assert.equal(readingText(blocks), source.replace(/\s+/g, " "));
  assert.equal(parseCommentaryText(" ").length, 0);
});

test("source HTML stays inert text and long prose is never split at guessed sentences", () => {
  const source =
    '<script>alert("example")</script> ' + "A complete sentence. ".repeat(100);
  assert.deepEqual(parseCommentaryText(source), [
    { type: "paragraph", text: source.trim() },
  ]);
});
