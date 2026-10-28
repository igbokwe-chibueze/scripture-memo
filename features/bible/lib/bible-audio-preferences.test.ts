/** Device preference regression checks: no DB, network or real browser state.
 * Invalid storage cannot set an unsupported media speed; writes must be immediate
 * and notify same-tab subscribers, with explicit failures when storage is blocked. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBibleAudioPreferences,
  readBibleAudioSnapshot,
  saveBibleAudioPreferences,
  subscribeBibleAudioPreferences,
} from "./bible-audio-preferences";

test("audio preferences reject corrupt or unsupported saved values", () => {
  const defaults = { speed: 1, narrator: "", planAutoplay: true };
  assert.deepEqual(parseBibleAudioPreferences(""), defaults);
  assert.deepEqual(
    parseBibleAudioPreferences("speed=99&narrator=David"),
    defaults,
  );
  assert.deepEqual(parseBibleAudioPreferences("speed=NaN"), defaults);
  assert.deepEqual(parseBibleAudioPreferences("speed=1.5&narrator=David"), {
    speed: 1.5,
    narrator: "David",
    planAutoplay: true,
  });
});

test("audio choices persist locally and notify without any server calls", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const stored = new Map<string, string>();
  const events = new EventTarget();
  const browser = {
    localStorage: {
      getItem: (key: string): string | null => stored.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        stored.set(key, value);
      },
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browser,
  });
  try {
    let notifications = 0;
    const unsubscribe = subscribeBibleAudioPreferences(() => {
      notifications += 1;
    });
    saveBibleAudioPreferences({ speed: 1.25, narrator: "David" });
    assert.deepEqual(parseBibleAudioPreferences(readBibleAudioSnapshot()), {
      speed: 1.25,
      narrator: "David",
      planAutoplay: true,
    });
    assert.equal(notifications, 1);
    saveBibleAudioPreferences({
      speed: 1.25,
      narrator: "David",
      planAutoplay: false,
    });
    assert.equal(
      parseBibleAudioPreferences(readBibleAudioSnapshot()).planAutoplay,
      false,
    );
    assert.equal(notifications, 2);
    unsubscribe();
    saveBibleAudioPreferences({ speed: 2, narrator: "John" });
    assert.equal(stored.size, 1);
    assert.equal(notifications, 2);
    browser.localStorage.setItem = (): never => {
      throw new Error("Storage blocked");
    };
    assert.throws(() =>
      saveBibleAudioPreferences({ speed: 1, narrator: "David" }),
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
