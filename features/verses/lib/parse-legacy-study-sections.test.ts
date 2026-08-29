import assert from "node:assert/strict";
import test from "node:test";
import { parseLegacyStudySections } from "@/features/verses/lib/parse-legacy-study-sections";

/**
 * Protects the one-time compatibility path used by migrations and curriculum
 * reset scripts. Losing this behavior would make an otherwise successful reset
 * create verses whose Sanctuary cards are empty.
 */
test("maps audited Markdown headings to ordered study-section types", () => {
  const sections = parseLegacyStudySections(`
**Psalm 1 Study Guide**

*Blessed is the man...*

## Book Background

Background copy.

## Tags

wisdom, faith

## Historical & Cultural Context

Historical copy.

## Reflection

Reflection is stored separately.

## Prayer

Prayer copy.
  `);

  assert.deepEqual(sections, [
    {
      type: "BOOK_BACKGROUND",
      position: 1,
      content: "Background copy.",
    },
    {
      type: "HISTORICAL_CONTEXT",
      position: 2,
      content: "Historical copy.",
    },
    {
      type: "PRAYER",
      position: 8,
      content: "Prayer copy.",
    },
  ]);
});

/** A heading-free legacy note remains readable rather than being discarded. */
test("preserves a heading-free note as the general Study Note section", () => {
  assert.deepEqual(parseLegacyStudySections("Remember the repeated phrase."), [
    {
      type: "STUDY_NOTE",
      position: 3,
      content: "Remember the repeated phrase.",
    },
  ]);
});
