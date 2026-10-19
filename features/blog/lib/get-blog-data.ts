import "server-only";

import type { BlogArticle } from "@/lib/generated/prisma/client";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { blogRepository } from "../repositories/blog.repository";
import { blogSearchSchema, type BlogSearch } from "../schemas/blog-search.schema";
import { blogSlugSchema } from "../schemas/save-blog-article.schema";
import type { BlogListing } from "../types/blog.types";

export type BlogSearchParams = Record<string, string | string[] | undefined>;

/** Narrow URL input before any public query; arrays cannot amplify search work. */
export function parseBlogSearch(params: BlogSearchParams): BlogSearch {
  return blogSearchSchema.parse({
    q: typeof params.q === "string" ? params.q : "",
    category: params.category,
    page: params.page,
  });
}

/** Public listing boundary never requires a login and never returns drafts. */
export async function getPublicBlogData(params: BlogSearchParams): Promise<{
  search: BlogSearch;
  listing: BlogListing;
}> {
  const search = parseBlogSearch(params);
  return { search, listing: await blogRepository.listPublished(search) };
}

/** Public detail is validated and request-deduplicated by the repository. */
export async function getPublicArticle(slug: string): Promise<BlogArticle | null> {
  const parsed = blogSlugSchema.safeParse(slug);
  return parsed.success ? blogRepository.getPublishedArticle(parsed.data) : null;
}

/** Authorize before looking up even an article's private title or draft status. */
export async function getAdminBlogData(params: BlogSearchParams): Promise<{
  listing: Awaited<ReturnType<typeof blogRepository.listForAdmin>>;
  page: number;
}> {
  await getAdminSession();
  const { page } = parseBlogSearch(params);
  return { listing: await blogRepository.listForAdmin(page), page };
}

/** The new-article page uses this same authorization boundary before rendering. */
export async function getArticleForEditor(id?: string): Promise<BlogArticle | null> {
  await getAdminSession();
  if (!id || id.length > 100) return null;
  return blogRepository.getForAdmin(id);
}
