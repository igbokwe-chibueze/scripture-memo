/** Offline regressions for the owner's schedule and device persistence. No
 * sessions, API requests or database fixtures are involved in these tests.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import { NEW_TESTAMENT_READING_DAYS as days } from "../data/new-testament-reading-plan";
import {
  nextReadingPlanDay,
  parseReadingPlanProgress,
  readReadingPlanSnapshot,
  subscribeReadingPlanProgress,
  updateReadingPlanProgress,
} from "./reading-plan-progress";

test("365-day source schedule covers every NT chapter exactly once and retains weekly cadence", () => {
  assert.equal(days.length, 365);
  assert.deepEqual(
    ["read", "reflect", "review", "yearReview"].map(
      (kind) => days.filter((day) => day.kind === kind).length,
    ),
    [260, 52, 52, 1],
  );
  const actual = days
    .filter((day) => day.kind === "read")
    .flatMap((day) =>
      day.chapters.map((chapter) => `${chapter.book}:${chapter.chapter}`),
    );
  const expected = BIBLE_BOOKS.filter(
    (book) => book.testament === "new",
  ).flatMap((book) =>
    book.chapters.map((_, index) => `${book.id}:${index + 1}`),
  );
  assert.equal(new Set(actual).size, 260);
  assert.deepEqual([...actual].sort(), expected.sort());
  for (const day of days.filter((item) => item.kind === "reflect")) {
    assert.deepEqual(
      day.chapters,
      days
        .slice(day.number - 6, day.number - 1)
        .flatMap((item) => item.chapters),
    );
  }
  // These independent document checkpoints detect reordered books and off-by-one
  // errors where a new phase starts in the middle of a reading week.
  for (const [number, book, chapter] of [
    [1, "MRK", 1],
    [22, "MRK", 16],
    [23, "JHN", 1],
    [51, "JHN", 21],
    [52, "LUK", 1],
    [85, "LUK", 24],
    [86, "ACT", 1],
    [123, "ACT", 28],
    [124, "EPH", 1],
    [155, "1JN", 5],
    [156, "MAT", 1],
    [218, "ROM", 1],
    [291, "JUD", 1],
    [292, "PHM", 1],
    [332, "HEB", 13],
    [333, "REV", 1],
    [362, "REV", 22],
  ] as const) {
    assert.deepEqual(days[number - 1].chapters, [{ book, chapter }]);
  }
  assert.deepEqual(days[334].chapters, [
    { book: "HEB", chapter: 11 },
    { book: "HEB", chapter: 12 },
    { book: "HEB", chapter: 13 },
    { book: "REV", chapter: 1 },
    { book: "REV", chapter: 2 },
  ]);
});

test("local progress survives rereads, supports gaps and undo, and fails safely", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const events = new EventTarget();
  const stored = new Map<string, string>();
  let notifications = 0;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string): string | null => stored.get(key) ?? null,
        setItem: (key: string, value: string): void => {
          stored.set(key, value);
        },
      },
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events),
    },
  });
  try {
    const unsubscribe = subscribeReadingPlanProgress(() => {
      notifications++;
    });
    assert.equal(readReadingPlanSnapshot(), "");
    updateReadingPlanProgress();
    assert.deepEqual(
      parseReadingPlanProgress(readReadingPlanSnapshot())?.completedDays,
      [],
    );
    updateReadingPlanProgress(2);
    assert.equal(
      nextReadingPlanDay(parseReadingPlanProgress(readReadingPlanSnapshot())),
      1,
    );
    updateReadingPlanProgress(1);
    assert.equal(
      nextReadingPlanDay(parseReadingPlanProgress(readReadingPlanSnapshot())),
      3,
    );
    updateReadingPlanProgress(1, false);
    assert.deepEqual(
      parseReadingPlanProgress(readReadingPlanSnapshot())?.completedDays,
      [2],
    );
    assert.equal(stored.size, 1);
    assert.equal(notifications, 4);
    unsubscribe();
    updateReadingPlanProgress(3);
    assert.equal(notifications, 4);
    assert.throws(() => updateReadingPlanProgress(366));
    assert.equal(parseReadingPlanProgress("broken"), null);
    assert.equal(
      parseReadingPlanProgress(
        JSON.stringify({
          version: 1,
          startedAt: new Date().toISOString(),
          completedDays: [-1],
        }),
      ),
      null,
    );
    assert.equal(
      nextReadingPlanDay({
        version: 1,
        startedAt: new Date().toISOString(),
        completedDays: Array.from({ length: 365 }, (_, index) => index + 1),
      }),
      null,
    );
    // A quota/security exception propagates so the calling UI displays an error
    // instead of falsely showing saved completion or emitting a change event.
    window.localStorage.setItem = (): never => {
      throw new Error("Storage blocked");
    };
    const before = readReadingPlanSnapshot();
    assert.throws(() => updateReadingPlanProgress(4));
    assert.equal(readReadingPlanSnapshot(), before);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
