/** Audio traversal regression tests: static schedules only, no network/DB. */
import assert from "node:assert/strict";
import test from "node:test";
import { READING_PLANS } from "../data/reading-plan-catalog";
import { nextPlanAudioChapter } from "./reading-plan-audio";
import { bibleAudioKey } from "./bible-audio-session";
import {
  bibleAudioNavigationSchema,
  bibleAudioRestSchema,
} from "../schemas/bible-audio.schema";

test("plan audio follows every assigned chapter and stops at each rest boundary", () => {
  for (const plan of Object.values(READING_PLANS)) {
    for (const day of plan.days) {
      day.chapters.forEach((chapter, index) => {
        const next = nextPlanAudioChapter(plan.id, day.number, chapter);
        const sibling = day.chapters[index + 1];
        const followingDay = plan.days[day.number];
        if (sibling) {
          assert.deepEqual(next, {
            kind: "chapter",
            day: day.number,
            chapter: sibling,
          });
        } else if (!followingDay) {
          assert.deepEqual(next, { kind: "finished" });
        } else if (followingDay.kind === "rest") {
          assert.deepEqual(next, { kind: "rest", day: followingDay.number });
        } else {
          assert.deepEqual(next, {
            kind: "chapter",
            day: followingDay.number,
            chapter: followingDay.chapters[0],
          });
        }
      });
    }
  }
});

test("ordinary or mismatched chapter provenance cannot advance a plan", () => {
  assert.deepEqual(
    nextPlanAudioChapter("new-testament", 1, { book: "GEN", chapter: 1 }),
    { kind: "finished" },
  );
  assert.deepEqual(
    nextPlanAudioChapter("new-testament", 7, { book: "MRK", chapter: 7 }),
    { kind: "finished" },
  );
  assert.deepEqual(
    nextPlanAudioChapter("old-testament", 0, { book: "GEN", chapter: 1 }),
    { kind: "finished" },
  );
});

test("persistent audio identity and navigation preserve explicit plan provenance", () => {
  const reference = {
    book: "MRK",
    chapter: 1,
    verse: 1,
    translation: "KJV" as const,
  };
  const plan = { planId: "new-testament" as const, day: 1 };
  assert.equal(
    bibleAudioKey(reference),
    bibleAudioKey({ ...reference, verse: 2 }),
  );
  assert.notEqual(bibleAudioKey(reference), bibleAudioKey(reference, plan));
  assert.equal(
    bibleAudioNavigationSchema.safeParse({ reference, plan }).success,
    true,
  );
  assert.equal(
    bibleAudioNavigationSchema.safeParse({
      reference,
      plan: { ...plan, day: 365 },
    }).success,
    false,
  );
  assert.equal(
    bibleAudioNavigationSchema.safeParse({
      reference,
      plan: { ...plan, day: 2 },
    }).success,
    false,
  );
  assert.equal(
    bibleAudioRestSchema.safeParse({ ...plan, day: 7 }).success,
    true,
  );
  assert.equal(bibleAudioRestSchema.safeParse(plan).success, false);
});
