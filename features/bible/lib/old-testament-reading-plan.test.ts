/** Offline contract checks for the supplied narrative schedule and isolated
 * chapter-based progress. No sessions, API calls or database fixtures are used.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import {
  OLD_TESTAMENT_PHASES as phases,
  OLD_TESTAMENT_READING_DAYS as days,
} from "../data/old-testament-reading-plan";
import source from "../data/old-testament-reading-source.json";
import {
  nextReadingPlanDay,
  parseReadingPlanProgress,
  readReadingPlanSnapshot,
  resetReadingPlanProgress,
  updateReadingPlanChapter,
  updateReadingPlanProgress,
} from "./reading-plan-progress";

test("the source plan has 365 reading days covering all 929 OT chapters exactly once", () => {
  assert.equal(days.length, 365);
  assert.deepEqual(
    days.map((day) => day.number),
    Array.from({ length: 365 }, (_, index) => index + 1),
  );
  assert.ok(
    days.every(
      (day) =>
        day.kind === "read" &&
        day.chapters.length >= 2 &&
        day.chapters.length <= 3,
    ),
  );
  const actual = days.flatMap((day) =>
    day.chapters.map((chapter) => `${chapter.book}:${chapter.chapter}`),
  );
  const expected = BIBLE_BOOKS.filter(
    (book) => book.testament === "old",
  ).flatMap((book) =>
    book.chapters.map((_, index) => `${book.id}:${index + 1}`),
  );
  assert.equal(actual.length, 929);
  assert.equal(new Set(actual).size, 929);
  assert.deepEqual([...actual].sort(), expected.sort());
  assert.deepEqual(
    days.map((day) => day.readingLabel),
    source.flatMap((phase) => phase.days.map((day) => day.reading)),
  );
  assert.deepEqual(
    phases.map((phase) => phase.end - phase.start + 1),
    [36, 54, 35, 64, 63, 67, 37, 9],
  );
  assert.deepEqual(
    phases.map((_, index) =>
      days
        .filter((day) => day.phase === index)
        .reduce((sum, day) => sum + day.chapters.length, 0),
    ),
    [92, 137, 90, 164, 160, 170, 94, 22],
  );
  assert.deepEqual(days[19].chapters, [
    { book: "GEN", chapter: 50 },
    { book: "JOB", chapter: 1 },
  ]);
  assert.deepEqual(days[284].chapters, [
    { book: "LAM", chapter: 5 },
    { book: "OBA", chapter: 1 },
    { book: "EZK", chapter: 1 },
  ]);
  assert.deepEqual(days[364].chapters, [
    { book: "MAL", chapter: 3 },
    { book: "MAL", chapter: 4 },
  ]);
});

test("partial chapter progress survives rereads and resets only the selected plan", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const stored = new Map<string, string>();
  const events = new EventTarget();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string): string | null => stored.get(key) ?? null,
        setItem: (key: string, value: string): void => {
          stored.set(key, value);
        },
        removeItem: (key: string): void => {
          stored.delete(key);
        },
      },
      dispatchEvent: events.dispatchEvent.bind(events),
    },
  });
  try {
    const id = "old-testament";
    updateReadingPlanProgress(1);
    const newSnapshot = readReadingPlanSnapshot();
    updateReadingPlanProgress(undefined, true, id);
    assert.equal(stored.size, 2);
    updateReadingPlanChapter({ book: "GEN", chapter: 1 }, true, id);
    updateReadingPlanChapter({ book: "GEN", chapter: 2 }, true, id);
    const partial = readReadingPlanSnapshot(id);
    assert.deepEqual(parseReadingPlanProgress(partial, id)?.completedDays, []);
    assert.deepEqual(parseReadingPlanProgress(partial, id)?.completedChapters, [
      "GEN:1",
      "GEN:2",
    ]);
    assert.equal(readReadingPlanSnapshot(id), partial);
    assert.equal(
      nextReadingPlanDay(parseReadingPlanProgress(partial, id), id),
      1,
    );
    updateReadingPlanChapter({ book: "GEN", chapter: 3 }, true, id);
    assert.deepEqual(
      parseReadingPlanProgress(readReadingPlanSnapshot(id), id)?.completedDays,
      [1],
    );
    assert.equal(
      nextReadingPlanDay(
        parseReadingPlanProgress(readReadingPlanSnapshot(id), id),
        id,
      ),
      2,
    );
    updateReadingPlanChapter({ book: "GEN", chapter: 3 }, false, id);
    assert.deepEqual(
      parseReadingPlanProgress(readReadingPlanSnapshot(id), id)?.completedDays,
      [],
    );
    updateReadingPlanChapter({ book: "GEN", chapter: 50 }, true, id);
    updateReadingPlanChapter({ book: "JOB", chapter: 1 }, true, id);
    assert.deepEqual(
      parseReadingPlanProgress(readReadingPlanSnapshot(id), id)?.completedDays,
      [20],
    );
    const before = readReadingPlanSnapshot(id);
    assert.throws(() =>
      updateReadingPlanChapter({ book: "MAT", chapter: 1 }, true, id),
    );
    assert.throws(() => updateReadingPlanProgress(1, true, id));
    assert.equal(readReadingPlanSnapshot(id), before);
    resetReadingPlanProgress(id);
    assert.equal(readReadingPlanSnapshot(id), "");
    assert.equal(readReadingPlanSnapshot(), newSnapshot);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
