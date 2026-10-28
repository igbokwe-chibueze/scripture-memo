/** Offline contracts for intent emission and daily network batching. These
 * tests deliberately mount no sync coordinator and never touch a database.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { shouldSyncParticipation } from "./reading-plan-participation-batching";
import { readingPlanParticipationSchema } from "../schemas/reading-plan-participation.schema";
import { PLAN_PARTICIPATION_INTENT } from "./reading-plan-participation-events";
import { NEW_TESTAMENT_READING_DAYS } from "../data/new-testament-reading-plan";
import {
  updateReadingPlanProgress,
  resetReadingPlanProgress,
  parseReadingPlanProgress,
  readReadingPlanSnapshot,
} from "./reading-plan-progress";

test("participation batches ordinary progress daily but preserves explicit transitions", () => {
  const day = "2026-10-28";
  assert.equal(shouldSyncParticipation("start", undefined, day), true);
  assert.equal(
    shouldSyncParticipation("start", { operation: "start", day }, day),
    false,
  );
  assert.equal(
    shouldSyncParticipation("activity", { operation: "start", day }, day),
    false,
  );
  assert.equal(
    shouldSyncParticipation(
      "activity",
      { operation: "activity", day: "2026-10-27" },
      day,
    ),
    true,
  );
  assert.equal(
    shouldSyncParticipation("complete", { operation: "activity", day }, day),
    true,
  );
  assert.equal(
    shouldSyncParticipation("complete", { operation: "complete", day }, day),
    false,
  );
  assert.equal(
    shouldSyncParticipation("activity", { operation: "complete", day }, day),
    true,
  );
  assert.equal(
    shouldSyncParticipation("reset", { operation: "activity", day }, day),
    true,
  );
  assert.equal(
    shouldSyncParticipation("start", { operation: "reset", day }, day),
    true,
  );
  assert.equal(
    shouldSyncParticipation("start", { operation: "complete", day }, day),
    false,
  );
  assert.equal(
    readingPlanParticipationSchema.safeParse({
      planId: "invented",
      operation: "start",
    }).success,
    false,
  );
  assert.equal(
    readingPlanParticipationSchema.safeParse({
      planId: "new-testament",
      operation: "start",
      userId: "other",
    }).success,
    false,
  );
});

test("only explicit successful device changes emit social participation intents", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  const events = new EventTarget();
  const intents: { planId: string; operation: string }[] = [];
  events.addEventListener(PLAN_PARTICIPATION_INTENT, (event) => {
    if (event instanceof CustomEvent)
      intents.push(readingPlanParticipationSchema.parse(event.detail));
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      dispatchEvent: events.dispatchEvent.bind(events),
    },
  });
  try {
    assert.equal(parseReadingPlanProgress(readReadingPlanSnapshot()), null);
    assert.equal(intents.length, 0);
    updateReadingPlanProgress();
    assert.equal(intents.at(-1)?.operation, "start");
    for (const day of NEW_TESTAMENT_READING_DAYS)
      updateReadingPlanProgress(day.number);
    assert.equal(intents.at(-1)?.operation, "complete");
    assert.equal(
      storage.size,
      1,
      "Only detailed device progress is stored without a coordinator.",
    );
    updateReadingPlanProgress(1, false);
    assert.equal(intents.at(-1)?.operation, "activity");
    resetReadingPlanProgress();
    assert.equal(intents.at(-1)?.operation, "reset");
    assert.equal(storage.size, 0);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
