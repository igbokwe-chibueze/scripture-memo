-- Fellowship insignias are fixed catalogue keys rather than upload URLs. This
-- keeps group identity safe, consistently rendered, and inexpensive to serve.
ALTER TABLE "Fellowship"
ADD COLUMN "insigniaKey" TEXT NOT NULL DEFAULT 'word-star';
