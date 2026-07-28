-- Distinguish the legacy UTC fallback from a timezone that was deliberately
-- detected or selected, preventing future devices from overwriting the choice.
ALTER TABLE "UserSettings"
ADD COLUMN "hasConfiguredTimeZone" BOOLEAN NOT NULL DEFAULT false;
