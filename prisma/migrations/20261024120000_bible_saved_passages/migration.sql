-- One account-owned row for an explicitly saved chapter or verse set. Existing
-- verse bookmarks/highlights stay untouched. Empty verses means whole chapter.
CREATE TABLE "BibleSavedPassage" (
  "userId" TEXT NOT NULL,
  "book" TEXT NOT NULL,
  "chapter" INTEGER NOT NULL,
  "translation" "TranslationCode" NOT NULL,
  "selectionKey" TEXT NOT NULL,
  "verses" INTEGER[] NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BibleSavedPassage_pkey" PRIMARY KEY ("userId", "book", "chapter", "translation", "selectionKey"),
  CONSTRAINT "BibleSavedPassage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BibleSavedPassage_userId_updatedAt_idx" ON "BibleSavedPassage"("userId", "updatedAt" DESC);
