import "server-only";

import { prisma } from "@/lib/prisma";
import { saveBlogArticleSchema, type SaveBlogArticleInput } from "../schemas/save-blog-article.schema";

/**
 * Explicit owner-requested local editorial import, never called by page reads.
 * The command validates the local database before importing this module. Only
 * private drafts can be created; a repeated run preserves the existing article
 * and any CMS edits. Creation and its system audit record commit atomically.
 */
export async function importEditorialDraft(input: SaveBlogArticleInput): Promise<{
  id: string;
  created: boolean;
}> {
  const article = saveBlogArticleSchema.parse(input);
  if (article.status !== "DRAFT" || article.id || article.version) {
    throw new Error("Editorial imports create new private drafts only.");
  }
  const existing = await prisma.blogArticle.findUnique({
    where: { slug: article.slug },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  return prisma.$transaction(async (transaction) => {
    // Unique slug is the final duplicate boundary; concurrent imports fail safely
    // rather than overwriting an editor's version or changing publication state.
    const draft = await transaction.blogArticle.create({
      data: { ...article, publishedAt: null },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: {
        action: "BLOG_EDITORIAL_DRAFT_IMPORTED",
        entityType: "BlogArticle",
        entityId: draft.id,
        metadata: { status: "DRAFT", source: "owner-requested-editorial" },
      },
    });
    return { id: draft.id, created: true };
  });
}

/** Close the command-owned connection without exposing Prisma outside repositories. */
export async function closeEditorialImportConnection(): Promise<void> {
  await prisma.$disconnect();
}
