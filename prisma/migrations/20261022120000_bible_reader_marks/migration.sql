-- Bible annotations intentionally reference canonical book/chapter/verse rather
-- than the finite learning curriculum. No existing learning data is changed.
CREATE TABLE "BibleVerseMark" (
    "userId" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "translation" "TranslationCode" NOT NULL,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "highlight" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BibleVerseMark_pkey" PRIMARY KEY ("userId", "book", "chapter", "verse", "translation"),
    CONSTRAINT "BibleVerseMark_highlight_check" CHECK ("highlight" IS NULL OR "highlight" IN ('teal', 'gold', 'blue')),
    CONSTRAINT "BibleVerseMark_reference_check" CHECK ("chapter" BETWEEN 1 AND 150 AND "verse" BETWEEN 1 AND 176),
    CONSTRAINT "BibleVerseMark_translation_check" CHECK ("translation" IN ('KJV', 'WEB', 'BSB')),
    CONSTRAINT "BibleVerseMark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "BibleVerseMark_userId_updatedAt_idx" ON "BibleVerseMark"("userId", "updatedAt" DESC);
