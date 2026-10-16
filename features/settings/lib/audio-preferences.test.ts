/** Boundary checks for persisted percentages and defensive browser presentation data. */
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAudioVolume } from "./audio-preferences";
import { updateUserSettingsSchema } from "../schemas/update-user-settings.schema";

test("audio settings accept whole percentages, including silent and maximum endpoints", () => {
  const volumes = updateUserSettingsSchema.pick({ soundEffectsVolume: true, ambienceVolume: true });
  for (const value of [0, 40, 80, 100]) {
    assert.equal(volumes.safeParse({ soundEffectsVolume: value, ambienceVolume: value }).success, true);
  }
  for (const value of [-1, 101, 1.5, NaN, Infinity, "80", undefined]) {
    assert.equal(volumes.safeParse({ soundEffectsVolume: value, ambienceVolume: 60 }).success, false);
    assert.equal(volumes.safeParse({ soundEffectsVolume: 80, ambienceVolume: value }).success, false);
  }
});

test("browser volume fallback preserves zero and clamps malformed presentation values", () => {
  for (const value of [null, undefined, "", "invalid", NaN, Infinity]) {
    assert.equal(normalizeAudioVolume(value, 80), 80);
  }
  assert.equal(normalizeAudioVolume("0", 80), 0);
  assert.equal(normalizeAudioVolume("40", 80), 40);
  assert.equal(normalizeAudioVolume(-5, 80), 0);
  assert.equal(normalizeAudioVolume(200, 80), 100);
});
