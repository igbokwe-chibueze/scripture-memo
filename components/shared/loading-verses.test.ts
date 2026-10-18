/** Deterministic boundary coverage for the owner's weighted scripture carousel. */
import assert from "node:assert/strict";
import test from "node:test";
import { chooseLoadingVerse, loadingVerseDuration, LOADING_VERSES } from "./loading-verses";

test("weighted slots give priority verses double probability on initial selection", () => {
  const total = LOADING_VERSES.reduce((sum, verse) => sum + verse.weight, 0);
  const counts = LOADING_VERSES.map(() => 0);
  for (let slot = 0; slot < total; slot += 1) {
    counts[chooseLoadingVerse(null, (slot + .5) / total)] += 1;
  }
  assert.deepEqual(counts, LOADING_VERSES.map((verse) => verse.weight));
});

test("every selection excludes the current verse, including random boundaries", () => {
  for (let previous = 0; previous < LOADING_VERSES.length; previous += 1) {
    for (const random of [0, .2, .5, .9, 1]) {
      assert.notEqual(chooseLoadingVerse(previous, random), previous);
    }
  }
});

test("reading durations have an eight-second floor and extend for longer text", () => {
  assert.equal(loadingVerseDuration("A short verse."), 8000);
  assert.equal(loadingVerseDuration(Array(40).fill("word").join(" ")), 12000);
  assert.equal(LOADING_VERSES.length, 12);
  assert.equal(LOADING_VERSES[11].text, "Let the word of Christ dwell in you richly in all wisdom.");
});
