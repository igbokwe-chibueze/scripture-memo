import { NavigationButton } from "@/components/shared/navigation-button";
import { BLOG_PAGE_SIZE } from "../constants/blog-categories";
import { blogPageHref } from "../lib/article-format";

/** Bounded server-rendered pagination; no background queries or infinite polling. */
export function BlogPagination({
  base,
  page,
  total,
  q,
  category,
}: {
  base: string;
  page: number;
  total: number;
  q?: string;
  category?: string;
}): React.ReactNode {
  const pages = Math.max(1, Math.ceil(total / BLOG_PAGE_SIZE));
  if (pages === 1 && page === 1) return null;
  return (
    <nav aria-label="Article pages" className="flex flex-wrap items-center justify-center gap-4 py-6">
      {page > 1 && (
        <NavigationButton
          href={blogPageHref(base, page - 1, q, category)}
          pendingLabel="Loading articles"
          variant="outline"
          className="min-h-11"
        >
          Previous
        </NavigationButton>
      )}
      <p className="text-sm text-muted-foreground">Page {page} · {pages} available</p>
      {page < pages && (
        <NavigationButton
          href={blogPageHref(base, page + 1, q, category)}
          pendingLabel="Loading articles"
          variant="outline"
          className="min-h-11"
        >
          Next
        </NavigationButton>
      )}
    </nav>
  );
}
