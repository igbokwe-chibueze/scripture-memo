-- Correct only the three approved BSB verse rows whose em dashes joined words.
-- The wording is otherwise preserved. These punctuation-only edits do not
-- change the meaning of the verse or the already-normalized answer text, where
-- punctuation has been represented as a word boundary since curriculum import.
--
-- This data migration updates existing development and future production data;
-- the matching canonical source entries are updated in prisma/data/curriculum.json.
-- rtrim removes the trailing blank created by the terminal dash in Habakkuk 2:4.
UPDATE "VerseTranslation" AS translation
SET
  "text" = rtrim(replace(translation."text", U&'\2014', ' ')),
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Verse" AS verse
WHERE
  translation."verseId" = verse."id"
  AND translation."translation" = 'BSB'
  AND verse."reference" IN (
    'Psalm 27:1',
    'Habakkuk 2:4',
    'Philippians 4:8'
  )
  AND position(U&'\2014' IN translation."text") > 0;
