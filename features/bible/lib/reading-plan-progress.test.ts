/** Offline regressions for the owner's schedule and device persistence. No
 * sessions, API requests or database fixtures are involved in these tests.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BIBLE_BOOKS } from "../data/bible-catalog";
import {
  NEW_TESTAMENT_READING_DAYS as days,
  NEW_TESTAMENT_PHASES as phases,
} from "../data/new-testament-reading-plan";
import {
  nextReadingPlanDay,
  parseReadingPlanProgress,
  readReadingPlanSnapshot,
  subscribeReadingPlanProgress,
  resetReadingPlanProgress,
  updateReadingPlanProgress,
} from "./reading-plan-progress";
import { READING_PLAN_CHAPTER_SUBTITLES } from "../data/reading-plan-chapter-subtitles";

test("every reading chapter has a specific editorial subtitle", () => {
  for (const book of BIBLE_BOOKS.filter((item) => item.testament === "new")) {
    const subtitles = READING_PLAN_CHAPTER_SUBTITLES[book.id];
    assert.equal(subtitles.length, book.chapters.length, book.name);
    assert.ok(subtitles.every((subtitle) => subtitle.trim().length > 0));
  }
});

test("303-day plan reads six days then rests on every seventh, without losing chapters", () => {
  assert.equal(days.length, 303);
  assert.deepEqual(
    ["read", "rest"].map(
      (kind) => days.filter((day) => day.kind === kind).length,
    ),
    [260, 43],
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
  for (const day of days.filter((item) => item.kind === "rest")) {
    assert.deepEqual(day.chapters, []);
    assert.equal(day.number % 7, 0);
    assert.ok(
      days
        .slice(day.number - 7, day.number - 1)
        .every((item) => item.kind === "read"),
    );
  }
  assert.ok(
    days
      .filter((day) => day.kind === "read")
      .every((day) => day.number % 7 !== 0),
  );
  // Chapter checkpoints and phase coverage catch reorderings and ensure the
  // six-day reading cycle continues across each phase boundary.
  for (const [number, book, chapter] of [
    [1, "MRK", 1],
    [18, "MRK", 16],
    [19, "JHN", 1],
    [43, "JHN", 21],
    [44, "LUK", 1],
    [71, "LUK", 24],
    [72, "ACT", 1],
    [103, "ACT", 28],
    [104, "EPH", 1],
    [129, "1JN", 5],
    [130, "MAT", 1],
    [181, "ROM", 1],
    [243, "JUD", 1],
    [244, "PHM", 1],
    [277, "HEB", 13],
    [278, "REV", 1],
    [303, "REV", 22],
  ] as const) {
    assert.deepEqual(days[number - 1].chapters, [{ book, chapter }]);
  }
  for (const [index, phase] of phases.entries()) {
    const scheduled = days.filter((day) => day.phase === index);
    assert.equal(phase.start, scheduled[0].number);
    assert.equal(phase.end, scheduled.at(-1)?.number);
    assert.equal(phase.start, index === 0 ? 1 : phases[index - 1].end + 1);
  }
  assert.equal(phases.at(-1)?.end, 303);
});

test("legacy progress preserves completed chapters without claiming newly placed rest days", () => {
  const startedAt = new Date().toISOString();
  const parsed = parseReadingPlanProgress(
    JSON.stringify({
      version: 1,
      startedAt,
      completedDays: [1, 5, 6, 7, 8, 9, 362, 365],
    }),
  );
  assert.deepEqual(parsed, {
    version: 2,
    startedAt,
    completedDays: [1, 5, 6, 8, 303],
  });
  const fullLegacy = parseReadingPlanProgress(
    JSON.stringify({
      version: 1,
      startedAt,
      completedDays: Array.from({ length: 365 }, (_, index) => index + 1),
    }),
  );
  assert.equal(fullLegacy?.completedDays.length, 260);
  assert.ok(
    fullLegacy?.completedDays.every((day) => days[day - 1].kind === "read"),
  );
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
        removeItem: (key: string): void => {
          stored.delete(key);
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
    // Reading an old record must not write it back or mark a different chapter.
    const key = [...stored.keys()][0];
    stored.set(
      key,
      JSON.stringify({
        version: 1,
        startedAt: new Date().toISOString(),
        completedDays: [8, 9],
      }),
    );
    const legacySnapshot = readReadingPlanSnapshot();
    assert.deepEqual(
      parseReadingPlanProgress(legacySnapshot)?.completedDays,
      [6, 8],
    );
    assert.equal(readReadingPlanSnapshot(), legacySnapshot);
    updateReadingPlanProgress(7);
    const upgraded: unknown = JSON.parse(readReadingPlanSnapshot());
    assert.deepEqual(
      parseReadingPlanProgress(readReadingPlanSnapshot())?.completedDays,
      [6, 7, 8],
    );
    assert.equal((upgraded as { version: number }).version, 2);
    assert.throws(() => updateReadingPlanProgress(304));
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
        version: 2,
        startedAt: new Date().toISOString(),
        completedDays: Array.from({ length: 303 }, (_, index) => index + 1),
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
    // Reset affects only the plan namespace and not other Bible preferences.
    stored.set("other-device-preference", "keep");
    resetReadingPlanProgress();
    assert.equal(readReadingPlanSnapshot(), "");
    assert.equal(stored.get("other-device-preference"), "keep");
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
