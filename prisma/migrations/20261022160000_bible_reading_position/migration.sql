-- Preserve the last explicitly opened passage without creating annotation rows.
-- A primary key bounds storage to one position per account; account deletion
-- cascades to this private preference. Existing accounts need no backfill.
CREATE TABLE "BibleReadingPosition" (
    "userId" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "translation" "TranslationCode" NOT NULL,
    CONSTRAINT "BibleReadingPosition_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "BibleReadingPosition_userId_fkey" FOREIGN KEY ("userId")
      REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
