import "server-only";

import { prisma } from "@/lib/prisma";
import { saveBlogArticleSchema, type SaveBlogArticleInput } from "../schemas/save-blog-article.schema";
import { LEARNING_SERIES } from "../data/learning-series";

/**
 * Explicit owner-authorized editorial publication, called only by a local command.
 * Validate every article before opening a transaction. Existing published slugs
 * are preserved; an existing draft blocks the batch instead of being silently
 * published or overwritten. New articles and their audit event commit together.
 * No normal public/admin read imports this maintenance boundary.
 */
export async function publishLearningSeries(input: SaveBlogArticleInput[]): Promise<number> {
  const articles = input.map((article) => saveBlogArticleSchema.parse(article));
  const approvedSlugs = new Set<string>(LEARNING_SERIES.map((article) => article.slug));
  if (
    articles.length !== approvedSlugs.size ||
    new Set(articles.map((article) => article.slug)).size !== articles.length ||
    articles.some((article) =>
      !approvedSlugs.has(article.slug) || article.status !== "PUBLISHED" || article.id || article.version)
  ) {
    throw new Error("Expected the unique owner-approved publication manifest.");
  }
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.blogArticle.findMany({
      where: { slug: { in: articles.map((article) => article.slug) } },
      select: { slug: true, status: true },
    });
    if (existing.some((article) => article.status !== "PUBLISHED")) {
      throw new Error("An existing draft requires review through the editor.");
    }
    const result = await transaction.blogArticle.createMany({
      data: articles.map((article) => ({ ...article, publishedAt: new Date() })),
      // The unique slug constraint protects concurrent/repeated imports and CMS edits.
      skipDuplicates: true,
    });
    if (result.count > 0) {
      await transaction.auditLog.create({
        data: {
          action: "BLOG_LEARNING_SERIES_PUBLISHED",
          entityType: "BlogArticle",
          metadata: { articleCount: result.count, source: "owner-approved-learning-series" },
        },
      });
    }
    return result.count;
  });
}

/** Close the command-owned pool after either a successful publication or failure. */
export async function closeLearningSeriesConnection(): Promise<void> {
  await prisma.$disconnect();
}
