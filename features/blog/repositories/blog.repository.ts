import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma, type BlogArticle } from "@/lib/generated/prisma/client";
import type { SaveBlogArticleInput } from "../schemas/save-blog-article.schema";
import type { BlogSearch } from "../schemas/blog-search.schema";
import type { BlogListing } from "../types/blog.types";
import { BLOG_PAGE_SIZE } from "../constants/blog-categories";

/** Expected save conflicts leave the transaction and immutable audit unchanged. */
export class BlogSaveConflict extends Error {
  constructor(public readonly reason: "STALE" | "SLUG") {
    super(reason);
    this.name = "BlogSaveConflict";
  }
}

const summarySelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  byline: true,
  publishedAt: true,
  updatedAt: true,
} as const satisfies Prisma.BlogArticleSelect;

/** Deduplicate metadata/page reads within a request, without caching drafts publicly. */
const getPublishedArticle = cache(async (slug: string): Promise<BlogArticle | null> => {
  return prisma.blogArticle.findFirst({ where: { slug, status: "PUBLISHED" } });
});

/**
 * Only database boundary for editorial content. Public methods always enforce
 * publication; callers of admin methods must first obtain an authorized session.
 * Reads never initialize content. Search performs two bounded queries per
 * submitted filter/page, with no polling, client keystroke queries, or N+1 work.
 */
export const blogRepository = {
  getPublishedArticle,

  /** Return one bounded public page, never body content or draft metadata. */
  async listPublished(search: BlogSearch): Promise<BlogListing> {
    const where: Prisma.BlogArticleWhereInput = {
      status: "PUBLISHED",
      ...(search.category === "ALL" ? {} : { category: search.category }),
      ...(search.q ? {
        AND: search.q.split(/\s+/).slice(0, 8).map((term) => ({
          OR: ["title", "excerpt", "content"].map((field) => ({
            [field]: { contains: term, mode: "insensitive" },
          })),
        })),
      } : {}),
    };
    const [articles, total] = await Promise.all([
      prisma.blogArticle.findMany({
        where,
        select: summarySelect,
        orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
        skip: (search.page - 1) * BLOG_PAGE_SIZE,
        take: BLOG_PAGE_SIZE,
      }),
      prisma.blogArticle.count({ where }),
    ]);
    return { articles, total };
  },

  /** Authorized editor inventory uses the same bounded paging budget as public search. */
  async listForAdmin(page: number): Promise<{
    articles: (Pick<BlogArticle, "status" | "version"> & BlogListing["articles"][number])[];
    total: number;
  }> {
    const [articles, total] = await Promise.all([
      prisma.blogArticle.findMany({
        select: { ...summarySelect, status: true, version: true },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: BLOG_PAGE_SIZE,
        skip: (page - 1) * BLOG_PAGE_SIZE,
      }),
      prisma.blogArticle.count(),
    ]);
    return { articles, total };
  },

  /** Private read: the view authenticates ADMIN/SUPER_ADMIN before calling. */
  async getForAdmin(id: string): Promise<BlogArticle | null> {
    return prisma.blogArticle.findUnique({ where: { id } });
  },

  /**
   * Save and audit atomically. Version matching prevents lost updates even if
   * two requests read the same version concurrently. Once published, a slug is
   * permanent, including after unpublishing, so previously shared links stay stable.
   */
  async save(input: SaveBlogArticleInput, actorId: string): Promise<BlogArticle> {
    return prisma.$transaction(async (transaction) => {
      const before = input.id
        ? await transaction.blogArticle.findUnique({
          where: { id: input.id },
          select: { slug: true, status: true, version: true, publishedAt: true },
        })
        : null;
      if (input.id && (!before || before.version !== input.version)) {
        throw new BlogSaveConflict("STALE");
      }
      if (before?.publishedAt && before.slug !== input.slug) {
        throw new BlogSaveConflict("SLUG");
      }
      const { id, version } = input;
      const fields = {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        content: input.content,
        category: input.category,
        status: input.status,
        byline: input.byline,
      };
      const publishedAt = before?.publishedAt ??
        (input.status === "PUBLISHED" ? new Date() : null);
      let article: BlogArticle;
      if (before && id && version) {
        const result = await transaction.blogArticle.updateMany({
          where: { id, version },
          data: { ...fields, publishedAt, version: { increment: 1 } },
        });
        if (result.count !== 1) throw new BlogSaveConflict("STALE");
        article = await transaction.blogArticle.findUniqueOrThrow({ where: { id } });
      } else {
        article = await transaction.blogArticle.create({ data: { ...fields, publishedAt } });
      }
      await transaction.auditLog.create({
        data: {
          actorId,
          action: "BLOG_ARTICLE_SAVED",
          entityType: "BlogArticle",
          entityId: article.id,
          // Do not copy article bodies, credentials, or personal bylines into logs.
          metadata: {
            previousStatus: before?.status ?? null,
            nextStatus: article.status,
            version: article.version,
            slug: article.slug,
          },
        },
      });
      return article;
    });
  },
};
