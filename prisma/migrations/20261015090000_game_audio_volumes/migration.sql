-- Add account-backed volume preferences. Defaults apply to existing learners;
-- no profile, reward, or gameplay records are removed or rewritten.
ALTER TABLE "UserSettings"
ADD COLUMN "soundEffectsVolume" INTEGER NOT NULL DEFAULT 80,
ADD COLUMN "ambienceVolume" INTEGER NOT NULL DEFAULT 60;

-- Enforce the same range as the Server Action schema at the database boundary.
ALTER TABLE "UserSettings"
ADD CONSTRAINT "UserSettings_soundEffectsVolume_range"
CHECK ("soundEffectsVolume" BETWEEN 0 AND 100),
ADD CONSTRAINT "UserSettings_ambienceVolume_range"
CHECK ("ambienceVolume" BETWEEN 0 AND 100);
