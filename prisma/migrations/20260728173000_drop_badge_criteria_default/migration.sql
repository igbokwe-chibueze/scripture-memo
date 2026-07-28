-- The temporary MANUAL default made the required column safe for existing rows.
-- New badge definitions must now choose an explicit criterion so accidental
-- inert records cannot be created by relying on a database fallback.
ALTER TABLE "Badge"
ALTER COLUMN "criteriaKey" DROP DEFAULT;
