import "server-only";

import { prisma } from "@/lib/prisma";
import { STARTER_ARTICLES } from "../data/starter-articles";

/**
 * Explicit local maintenance boundary, never imported by an ordinary page read.
 * Installs static starter articles once and audits the batch in one transaction.
 * Unique-slug skips preserve administrator revisions on every subsequent run.
 */
export async function installStarterBlogArticles(): Promise<number> {
  return prisma.$transaction(async (transaction) => {
    const now = new Date();
    const result = await transaction.blogArticle.createMany({
      data: STARTER_ARTICLES.map((article) => ({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content: article.content,
        category: article.category,
        status: article.status,
        byline: article.byline,
        publishedAt: now,
      })),
      skipDuplicates: true,
    });
    if (result.count > 0) {
      await transaction.auditLog.create({
        data: {
          action: "BLOG_STARTER_ARTICLES_INSTALLED",
          entityType: "BlogArticle",
          metadata: { articleCount: result.count },
        },
      });
    }
    return result.count;
  });
}

/** Release the maintenance command's pool without exposing Prisma to scripts. */
export async function closeBlogMaintenanceConnection(): Promise<void> {
  await prisma.$disconnect();
}
