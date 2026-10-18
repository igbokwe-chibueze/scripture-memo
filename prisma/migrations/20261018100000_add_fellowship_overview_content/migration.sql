-- Optional introduction and leader-edited plain-text guidelines.
-- Existing groups retain their About description and use localized UI defaults
-- until a leader saves custom content. No learner progress or identity changes.
ALTER TABLE "Fellowship"
ADD COLUMN "introduction" TEXT,
ADD COLUMN "guidelines" TEXT;
