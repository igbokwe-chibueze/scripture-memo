import type { BlogArticle } from "@/lib/generated/prisma/client";

/** Public listing deliberately excludes body text and any administrative identity. */
export type BlogArticleSummary = Pick<
  BlogArticle,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "category"
  | "byline"
  | "publishedAt"
  | "updatedAt"
>;

export type BlogArticleEditorData = BlogArticle;

export type BlogListing = {
  articles: BlogArticleSummary[];
  total: number;
};
