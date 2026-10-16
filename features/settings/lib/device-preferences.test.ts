/** Local preference tests use a disposable browser facade; no database or real storage. */
import assert from "node:assert/strict";
import test from "node:test";
import { readDevicePreferences, saveDevicePreferences } from "./device-preferences";
import { accountSettingsSchema } from "../schemas/update-user-settings.schema";

test("device values persist, malformed values fall back, and blocked storage fails safely", (t) => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const values = new Map<string, string>();
  const events: string[] = [];
  const writes: string[] = [];
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: {
      getItem: (key: string): string | null => values.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        writes.push(key);
        values.set(key, value);
      },
    },
    dispatchEvent: (event: Event): void => { events.push(event.type); },
  } });
  Object.defineProperty(globalThis, "document", { configurable: true, value: {
    documentElement: { dataset: {}, classList: { toggle: (): void => undefined } },
  } });
  t.after(() => {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
    else Reflect.deleteProperty(globalThis, "document");
  });
  const defaults = readDevicePreferences();
  assert.equal(defaults.soundEffectsVolume, 80);
  assert.equal(defaults.ambienceVolume, 60);
  const saved = { ...defaults, audioEnabled: false, soundEffectsVolume: 35, ambienceVolume: 0, reducedMotion: true, theme: "dark" as const };
  assert.equal(saveDevicePreferences(saved), true);
  assert.deepEqual(readDevicePreferences(), saved);
  writes.length = 0;
  assert.equal(saveDevicePreferences(saved), true);
  assert.deepEqual(writes, [], "Unchanged preferences cause no storage writes.");
  assert.equal(saveDevicePreferences({ ...saved, soundEffectsVolume: 40 }), true);
  assert.deepEqual(writes, ["scripture-memo:effects-volume"]);
  assert.ok(events.includes("scripture-memo:device-preferences"));
  values.set("scripture-memo:effects-volume", "999");
  values.set("theme", "unknown");
  assert.equal(readDevicePreferences().soundEffectsVolume, 80);
  assert.equal(readDevicePreferences().theme, "system");
  Object.defineProperty(window, "localStorage", { get: () => { throw new Error("Blocked"); } });
  assert.deepEqual(readDevicePreferences(), defaults);
  assert.equal(saveDevicePreferences(saved), false);
});

test("account boundary strips presentation and language fields before persistence", () => {
  const parsed = accountSettingsSchema.parse({
    displayName: "Local Test", countryCode: "", avatarKey: "lion", avatarFrameKey: "default",
    preferredTranslation: "KJV", timeZone: "UTC", locale: "fr", audioEnabled: false,
    reducedMotion: true, soundEffectsVolume: 35, ambienceVolume: 0, theme: "dark",
  });
  assert.deepEqual(Object.keys(parsed).sort(), [
    "avatarFrameKey", "avatarKey", "countryCode", "displayName", "preferredTranslation", "timeZone",
  ]);
});
