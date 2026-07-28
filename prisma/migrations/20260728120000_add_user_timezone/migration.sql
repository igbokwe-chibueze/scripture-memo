-- Store an IANA timezone per learner so calendar-day streak boundaries are
-- deterministic on the server. Existing accounts safely fall back to UTC.
ALTER TABLE "UserSettings"
ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC';
