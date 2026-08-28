-- Corrective, idempotent synchronization for environments whose curriculum
-- existed before audited DOCX tags became part of the canonical seed data.
--
-- Delimited split_part calls are used instead of a complex regular expression:
-- every approved guide places Tags directly before Book Background. This keeps
-- the extraction compatible across PostgreSQL regex implementations.
WITH guide_tag_blocks AS (
  SELECT
    verse."id" AS "verseId",
    trim(
      BOTH E' \n\r*'
      FROM split_part(
        split_part(verse."studyNote", '## Tags', 2),
        '## Book Background',
        1
      )
    ) AS tag_block
  FROM "Verse" AS verse
  WHERE verse."studyNote" IS NOT NULL
    AND verse."studyNote" LIKE '%## Tags%'
), guide_tag_labels AS (
  SELECT DISTINCT
    block."verseId",
    trim(tag_label) AS name
  FROM guide_tag_blocks AS block
  CROSS JOIN LATERAL regexp_split_to_table(
    block.tag_block,
    '[[:space:]]*•[[:space:]]*'
  ) AS tag_label
), normalized_guide_tags AS (
  SELECT
    "verseId",
    name,
    trim(BOTH '-' FROM regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) AS slug
  FROM guide_tag_labels
  WHERE name <> ''
), inserted_tags AS (
  INSERT INTO "Tag" ("id", "name", "slug", "createdAt", "updatedAt")
  SELECT DISTINCT
    'study-tag:' || md5(slug),
    name,
    slug,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM normalized_guide_tags
  WHERE slug <> ''
  ON CONFLICT ("slug") DO NOTHING
  RETURNING "id"
)
INSERT INTO "VerseTag" ("verseId", "tagId", "createdAt")
SELECT
  guide_tag."verseId",
  tag."id",
  CURRENT_TIMESTAMP
FROM normalized_guide_tags AS guide_tag
INNER JOIN "Tag" AS tag ON tag."slug" = guide_tag.slug
ON CONFLICT ("verseId", "tagId") DO NOTHING;
