-- Owner-approved move of presentation preferences to browser storage/cookie.
-- Browsers keep their existing theme/language; missing device values use defaults.
-- This intentionally discards old account-level presentation choices only.
-- Profile, translation, timezone, progression, and reward records remain intact.
ALTER TABLE "UserSettings"
  DROP COLUMN "audioEnabled",
  DROP COLUMN "soundEffectsVolume",
  DROP COLUMN "ambienceVolume",
  DROP COLUMN "reducedMotion",
  DROP COLUMN "theme",
  DROP COLUMN "locale";
