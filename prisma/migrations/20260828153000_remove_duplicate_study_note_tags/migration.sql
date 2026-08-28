-- VerseTag is now the only canonical representation of verse tags.
--
-- Earlier imports retained the DOCX "## Tags" block inside the rollback-safe
-- studyNote Markdown as well as creating structured Tag/VerseTag records. Remove
-- that duplicate block after the preceding migrations have merged its values.
-- The preamble and every devotional section remain byte-for-byte unchanged.
UPDATE "Verse"
SET
  "studyNote" = trim(
    split_part("studyNote", '## Tags', 1)
    || '## Book Background'
    || split_part("studyNote", '## Book Background', 2)
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "studyNote" IS NOT NULL
  AND "studyNote" LIKE '%## Tags%'
  AND "studyNote" LIKE '%## Book Background%';
