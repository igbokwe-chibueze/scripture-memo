/** Browser resume regression checks run without a DB, network or real account.
 * A tiny in-memory Storage substitute verifies synchronous refresh persistence;
 * invalid or inaccessible storage must not stop normal reading. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  parseBibleDevicePosition,
  readBibleDevicePosition,
  saveBibleDevicePosition,
} from "./bible-device-position";

test("device position survives rereads and replaces the previous passage", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const stored = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string): string | null => stored.get(key) ?? null,
        setItem: (key: string, value: string): void => {
          stored.set(key, value);
        },
      },
    },
  });
  try {
    assert.equal(readBibleDevicePosition(), null);
    const first = {
      book: "PSA",
      chapter: 119,
      verse: 105,
      translation: "KJV" as const,
    };
    saveBibleDevicePosition(first);
    assert.deepEqual(
      parseBibleDevicePosition(readBibleDevicePosition()),
      first,
    );
    const next = {
      book: "JHN",
      chapter: 3,
      verse: 16,
      translation: "WEB" as const,
    };
    saveBibleDevicePosition(next);
    assert.deepEqual(parseBibleDevicePosition(readBibleDevicePosition()), next);
    assert.equal(stored.size, 1);
    assert.equal(
      parseBibleDevicePosition("book=PSA&chapter=999&verse=1&translation=KJV"),
      null,
    );
    assert.equal(parseBibleDevicePosition("not-a-reference"), null);
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      get: () => {
        throw new Error("Storage blocked");
      },
    });
    assert.equal(readBibleDevicePosition(), null);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
