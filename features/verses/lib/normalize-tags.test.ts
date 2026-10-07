import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeTagLabel,
  normalizeTags,
} from "@/features/verses/lib/normalize-tags";

test("tag labels use one readable title-case convention", () => {
  assert.equal(normalizeTagLabel("GOD'S LOVE"), "God's Love");
  assert.equal(normalizeTagLabel("fruit OF THE spirit"), "Fruit of the Spirit");
  assert.equal(normalizeTagLabel("self-control"), "Self-Control");
});

test("case-only tag variants collapse to one canonical identity", () => {
  assert.deepEqual(
    normalizeTags("faith, FAITH, Faith, dependence on God"),
    ["Faith", "Dependence on God"],
  );
});
