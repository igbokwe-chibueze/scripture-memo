-- Tags live on existing owner-scoped saved records, avoiding join rows and
-- extra writes for each label. Empty defaults preserve every existing save.
ALTER TABLE "BibleVerseMark" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "BibleSavedPassage" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Containment filtering uses GIN alongside the existing account/date indexes.
CREATE INDEX "BibleVerseMark_tags_idx" ON "BibleVerseMark" USING GIN ("tags");
CREATE INDEX "BibleSavedPassage_tags_idx" ON "BibleSavedPassage" USING GIN ("tags");
