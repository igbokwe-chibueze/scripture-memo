-- Additive editorial storage only: existing player and curriculum data is untouched.
-- Draft publication is explicit. Unique slugs and optimistic versions protect
-- stable links and prevent one administrator from overwriting another's save.
CREATE TYPE "BlogArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "BlogCategory" AS ENUM ('GUIDE', 'NEWS', 'BEHIND_SCENES');
CREATE TABLE "BlogArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "BlogCategory" NOT NULL DEFAULT 'GUIDE',
    "status" "BlogArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "byline" TEXT NOT NULL DEFAULT 'Scripture Memo',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BlogArticle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BlogArticle_publication_check" CHECK (
      "status" <> 'PUBLISHED' OR "publishedAt" IS NOT NULL
    )
);
CREATE UNIQUE INDEX "BlogArticle_slug_key" ON "BlogArticle"("slug");
CREATE INDEX "BlogArticle_status_category_publishedAt_idx"
  ON "BlogArticle"("status", "category", "publishedAt" DESC);
CREATE INDEX "BlogArticle_status_publishedAt_idx"
  ON "BlogArticle"("status", "publishedAt" DESC);
