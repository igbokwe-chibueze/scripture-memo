/**
 * Verify account learning preferences remain persistent after device fields retire.
 * This suite fails closed unless an isolated local TEST_DATABASE_URL is confirmed.
 * Fixtures require an empty test-user table and cleanup only this run's user.
 * Run with tsx --conditions=react-server --test; never targets development data.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

test("account learning preferences survive reload without storing device fields", {
  skip: process.env.TEST_DATABASE_URL ? false : "TEST_DATABASE_URL is not configured.",
}, async () => {
  process.env.DATABASE_URL = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl: process.env.DATABASE_URL,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
  });
  const { prisma } = await import("@/lib/prisma");
  const { settingsRepository } = await import("./settings.repository");
  const userId = `audio-test-${Date.now()}`;
  let created = false;
  try {
    assert.equal(await prisma.user.count(), 0, "Test users must be empty before fixture creation.");
    await prisma.user.create({
      data: { id: userId, name: "Audio test", email: `${userId}@example.test` },
    });
    created = true;
    await prisma.userSettings.create({ data: { userId } });
    // A translation-only patch must not initialize or rewrite public identity.
    const originalUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await settingsRepository.updateForUser(userId, { preferredTranslation: "WEB" });
    assert.equal(await prisma.userProfile.count({ where: { userId } }), 0);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).updatedAt.toISOString(), originalUser.updatedAt.toISOString());
    assert.equal((await prisma.userSettings.findUniqueOrThrow({ where: { userId } })).hasConfiguredTimeZone, false);
    await settingsRepository.updateForUser(userId, {
      displayName: "Audio test", countryCode: "", avatarKey: "lion",
      avatarFrameKey: "default", preferredTranslation: "WEB",
      timeZone: "Africa/Lagos",
    });
    // A fresh connection represents a subsequent request or another signed-in device.
    await prisma.$disconnect();
    const restored = await settingsRepository.getByUserId(userId);
    assert.equal(restored?.preferredTranslation, "WEB");
    assert.equal(restored?.timeZone, "Africa/Lagos");
    for (const key of ["theme", "locale", "audioEnabled", "soundEffectsVolume", "ambienceVolume", "reducedMotion"]) {
      assert.equal(key in (restored ?? {}), false);
    }
    assert.equal(await settingsRepository.getByUserId(`${userId}-other`), null);
    const userBefore = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const profileBefore = await prisma.userProfile.findUniqueOrThrow({ where: { userId } });
    await settingsRepository.updateForUser(userId, { timeZone: "UTC" });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).updatedAt.toISOString(), userBefore.updatedAt.toISOString());
    assert.equal((await prisma.userProfile.findUniqueOrThrow({ where: { userId } })).updatedAt.toISOString(), profileBefore.updatedAt.toISOString());
    assert.equal((await settingsRepository.getByUserId(userId))?.preferredTranslation, "WEB");
    const settingsBefore = await prisma.userSettings.findUniqueOrThrow({ where: { userId } });
    await settingsRepository.updateForUser(userId, { countryCode: "NG" });
    assert.equal((await prisma.userSettings.findUniqueOrThrow({ where: { userId } })).updatedAt.toISOString(), settingsBefore.updatedAt.toISOString());
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).updatedAt.toISOString(), userBefore.updatedAt.toISOString());
    await settingsRepository.updateForUser(userId, { displayName: "Renamed Learner" });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).name, "Renamed Learner");
    assert.equal((await prisma.userProfile.findUniqueOrThrow({ where: { userId } })).displayName, "Renamed Learner");
    assert.equal((await prisma.userSettings.findUniqueOrThrow({ where: { userId } })).updatedAt.toISOString(), settingsBefore.updatedAt.toISOString());
  } finally {
    // Never remove any unrelated fixture/account, including when the empty guard fails.
    await prisma.$disconnect();
    if (created) await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  }
});
