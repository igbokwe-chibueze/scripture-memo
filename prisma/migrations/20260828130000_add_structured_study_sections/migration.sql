-- Store each approved study-guide subject independently so the learner page
-- never has to infer card meaning or order from unrestricted Markdown.
CREATE TYPE "VerseStudySectionType" AS ENUM (
  'BOOK_BACKGROUND',
  'HISTORICAL_CONTEXT',
  'STUDY_NOTE',
  'KEY_LESSON',
  'APPLICATION',
  'CROSS_REFERENCES',
  'WORD_STUDY',
  'PRAYER'
);

CREATE TABLE "VerseStudySection" (
  "id" TEXT NOT NULL,
  "verseId" TEXT NOT NULL,
  "type" "VerseStudySectionType" NOT NULL,
  "position" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VerseStudySection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerseStudySection_verseId_type_key"
ON "VerseStudySection"("verseId", "type");

CREATE INDEX "VerseStudySection_verseId_position_idx"
ON "VerseStudySection"("verseId", "position");

ALTER TABLE "VerseStudySection"
ADD CONSTRAINT "VerseStudySection_verseId_fkey"
FOREIGN KEY ("verseId") REFERENCES "Verse"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill the audited guides already stored in Verse.studyNote. Every imported
-- guide uses level-two Markdown headings. Tags and Reflection are intentionally
-- omitted here because they already have dedicated structured storage.
WITH parsed_sections AS (
  SELECT
    verse."id" AS "verseId",
    parts.position,
    trim(split_part(parts.chunk, E'\n', 1)) AS heading,
    trim(substr(parts.chunk, strpos(parts.chunk, E'\n') + 1)) AS content
  FROM "Verse" AS verse
  CROSS JOIN LATERAL regexp_split_to_table(
    verse."studyNote",
    E'^##[[:space:]]+',
    'm'
  ) WITH ORDINALITY AS parts(chunk, position)
  WHERE verse."studyNote" IS NOT NULL
    AND parts.position > 1
), typed_sections AS (
  SELECT
    "verseId",
    CASE lower(heading)
      WHEN 'book background' THEN 'BOOK_BACKGROUND'::"VerseStudySectionType"
      WHEN 'historical & cultural context' THEN 'HISTORICAL_CONTEXT'::"VerseStudySectionType"
      WHEN 'historical and cultural context' THEN 'HISTORICAL_CONTEXT'::"VerseStudySectionType"
      WHEN 'study note' THEN 'STUDY_NOTE'::"VerseStudySectionType"
      WHEN 'key lesson' THEN 'KEY_LESSON'::"VerseStudySectionType"
      WHEN 'application' THEN 'APPLICATION'::"VerseStudySectionType"
      WHEN 'cross references' THEN 'CROSS_REFERENCES'::"VerseStudySectionType"
      WHEN 'word study' THEN 'WORD_STUDY'::"VerseStudySectionType"
      WHEN 'prayer' THEN 'PRAYER'::"VerseStudySectionType"
      ELSE NULL
    END AS type,
    CASE lower(heading)
      WHEN 'book background' THEN 1
      WHEN 'historical & cultural context' THEN 2
      WHEN 'historical and cultural context' THEN 2
      WHEN 'study note' THEN 3
      WHEN 'key lesson' THEN 4
      WHEN 'application' THEN 5
      WHEN 'cross references' THEN 6
      WHEN 'word study' THEN 7
      WHEN 'prayer' THEN 8
      ELSE NULL
    END AS position,
    content
  FROM parsed_sections
)
INSERT INTO "VerseStudySection" (
  "id",
  "verseId",
  "type",
  "position",
  "content",
  "updatedAt"
)
SELECT
  "verseId" || ':' || type::TEXT,
  "verseId",
  type,
  position,
  content,
  CURRENT_TIMESTAMP
FROM typed_sections
WHERE type IS NOT NULL
  AND content <> '';

-- Verse.studyNote remains temporarily as rollback-safe legacy source data. New
-- application writes use VerseStudySection and no longer depend on this field.
