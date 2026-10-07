import assert from "node:assert/strict";
import test from "node:test";
import { updatePlatformSettingsSchema } from "@/features/platform-settings/schemas/update-platform-settings.schema";

/**
 * Keeps the public Super Admin boundary aligned with the documented operating
 * limits. These tests exercise only the pure schema and never open a database.
 */
test("accepts the current KJV default and bounded platform values", () => {
  const result = updatePlatformSettingsSchema.safeParse({
    defaultTranslation: "KJV",
    baseGlowPoints: 100,
    defaultHintAllowance: 5,
    adminCooldownTestingEnabled: true,
  });

  assert.equal(result.success, true);
});

test("rejects retired/licensed translation codes and invalid numeric limits", () => {
  const retiredTranslation = updatePlatformSettingsSchema.safeParse({
    defaultTranslation: "NIV",
    baseGlowPoints: 100,
    defaultHintAllowance: 5,
    adminCooldownTestingEnabled: true,
  });
  const invalidRewards = updatePlatformSettingsSchema.safeParse({
    defaultTranslation: "KJV",
    baseGlowPoints: 0,
    defaultHintAllowance: 101,
    adminCooldownTestingEnabled: true,
  });

  assert.equal(retiredTranslation.success, false);
  assert.equal(invalidRewards.success, false);
});
