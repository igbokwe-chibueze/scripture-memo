-- A verse may appear once in Learn, Recall, and Strengthen, while Master may
-- intentionally repeat. PostgreSQL's partial unique index expresses this rule
-- without blocking multiple unassigned placeholders or repeated Master stages.
CREATE UNIQUE INDEX "Waypoint_unique_non_master_verse_stage"
ON "Waypoint"("verseId", "journeyStage")
WHERE "verseId" IS NOT NULL AND "journeyStage" <> 'MASTER';
