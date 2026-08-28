-- Merge the audited study-guide tags into the existing structured tag catalogue.
--
-- The Excel tags remain attached to each verse. This migration only adds missing
-- guide tags, making the operation idempotent and preventing useful broad tags
-- from being destroyed. Verse.studyNote is still present as rollback-safe source
-- data during this transition, so no application request has to parse Markdown.
WITH guide_tag_labels AS (
  SELECT DISTINCT
    verse."id" AS "verseId",
    trim(tag_label) AS name
  FROM "Verse" AS verse
  CROSS JOIN LATERAL regexp_split_to_table(
    substring(
      verse."studyNote"
      FROM '(?ms)^## Tags[[:space:]]+\*\*([^\n]+)\*\*'
    ),
    '[[:space:]]*•[[:space:]]*'
  ) AS tag_label
  WHERE verse."studyNote" IS NOT NULL
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
