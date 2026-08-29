-- The canonical name of the biblical book is "Psalms". Individual citations
-- remain singular (for example, "Psalm 23:1"), so only the structured `book`
-- field changes. References, translations, waypoint assignments, and learner
-- history remain untouched.
UPDATE "Verse"
SET "book" = 'Psalms',
    "updatedAt" = NOW()
WHERE LOWER("book") = 'psalm';
