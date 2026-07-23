-- Preserve the translation selected when a campaign session starts. Verse
-- translations become immutable once learner history exists, so this code is
-- sufficient to reproduce the same canonical answer throughout the session.
ALTER TABLE "GameSession"
ADD COLUMN "translation" "TranslationCode" NOT NULL DEFAULT 'NIV';

-- Game-mode attempts require terminal failure states that are intentionally
-- separate from day/session completion. This lets a learner retry one failed or
-- expired mode without corrupting the enclosing IN_PROGRESS session.
CREATE TYPE "GameModeAttemptStatus" AS ENUM (
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'EXPIRED'
);

ALTER TABLE "GameModeAttempt"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "GameModeAttempt"
ALTER COLUMN "status" TYPE "GameModeAttemptStatus"
USING (
  CASE "status"::text
    WHEN 'NOT_STARTED' THEN 'IN_PROGRESS'
    ELSE "status"::text
  END
)::"GameModeAttemptStatus";

ALTER TABLE "GameModeAttempt"
ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
