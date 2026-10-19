/** Scalar patches must preserve explicit values while excluding untouched fields. */
import assert from "node:assert/strict";
import test from "node:test";
import { getChangedSettings } from "./settings-diff";
import { accountSettingsPatchSchema } from "../schemas/update-user-settings.schema";

test("one scalar edit creates one field and a reverted draft creates no patch", () => {
  const saved = { countryCode: "NG", audioEnabled: true, soundEffectsVolume: 80 };
  assert.deepEqual(getChangedSettings(saved, { ...saved, soundEffectsVolume: 0 }), { soundEffectsVolume: 0 });
  assert.deepEqual(getChangedSettings(saved, { ...saved, audioEnabled: false }), { audioEnabled: false });
  assert.deepEqual(getChangedSettings(saved, { ...saved, countryCode: "" }), { countryCode: "" });
  assert.deepEqual(getChangedSettings(saved, { ...saved }), {});
});

test("account patches permit individual fields but reject empty, invalid, and device payloads", () => {
  assert.deepEqual(accountSettingsPatchSchema.parse({ timeZone: "Africa/Lagos" }), { timeZone: "Africa/Lagos" });
  assert.deepEqual(accountSettingsPatchSchema.parse({ countryCode: "" }), { countryCode: "" });
  for (const patch of [{}, { displayName: undefined }, { timeZone: "invalid" }, { audioEnabled: true }, { locale: "en" }]) {
    assert.equal(accountSettingsPatchSchema.safeParse(patch).success, false);
  }
});
