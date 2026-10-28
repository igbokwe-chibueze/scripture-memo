-- Reading position is now a device preference in browser storage. Remove only
-- the superseded resume table; bookmarks, highlights and all other user data
-- remain unchanged. Retain the earlier applied migration for migration history.
DROP TABLE "BibleReadingPosition";
