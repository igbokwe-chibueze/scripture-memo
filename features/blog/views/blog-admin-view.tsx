import type { Metadata } from "next";
import { NavigationButton } from "@/components/shared/navigation-button";
import { EmptyState } from "@/components/shared/empty-state";
import { getAdminBlogData, type BlogSearchParams } from "../lib/get-blog-data";
import { BLOG_CATEGORIES } from "../constants/blog-categories";
import { formatArticleDate } from "../lib/article-format";
import { BlogPagination } from "../components/blog-pagination";
import styles from "../components/blog.module.css";

export const metadata: Metadata = {
  title: "Blog editor | Scripture Memo",
  robots: { index: false, follow: false },
};

/** Authorized editorial inventory; public pages never import this private data. */
export async function BlogAdminView({ searchParams }: {
  searchParams: Promise<BlogSearchParams>;
}): Promise<React.ReactNode> {
  const { listing, page } = await getAdminBlogData(await searchParams);
  return (
    <main className={styles.container}>
      <div className="flex flex-wrap items-center justify-between gap-4 py-5">
        <div>
          <p className={styles.eyebrow}>Administration</p>
          <h1 className="font-heading text-3xl font-bold">Journal & guides</h1>
          <p className="mt-2 text-muted-foreground">Write, review, and publish the information your players need.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <NavigationButton href="/admin/blog/new" pendingLabel="Opening editor" className="min-h-12">
            New article
          </NavigationButton>
          <NavigationButton href="/blog" pendingLabel="Opening public blog" variant="outline" className="min-h-12">
            View blog
          </NavigationButton>
          <NavigationButton href="/admin" pendingLabel="Opening admin" variant="outline" className="min-h-12">
            Admin home
          </NavigationButton>
        </div>
      </div>
      <div className={styles.articleGrid}>
        {listing.articles.map((article) => (
          <article key={article.id} className={styles.articleCard}>
            <p className={styles.eyebrow}>
              {article.status === "PUBLISHED" ? "Published" : "Private draft"}
              {" · "}
              {BLOG_CATEGORIES[article.category]}
            </p>
            <h2>{article.title}</h2>
            <p>{article.excerpt || "No summary yet."}</p>
            <p className="text-xs">Updated {formatArticleDate(article.updatedAt)}</p>
            <NavigationButton
              href={`/admin/blog/${article.id}`}
              pendingLabel="Opening editor"
              variant="outline"
              className="min-h-11"
            >
              Edit article
            </NavigationButton>
          </article>
        ))}
      </div>
      {!listing.total && (
        <EmptyState
          title="Your journal starts here"
          description="Create an article, preview it, and publish when it is ready."
        />
      )}
      {listing.total > 0 && !listing.articles.length && (
        <EmptyState
          title="No articles on this page"
          description="Return to the first page to see your articles."
          action={
            <NavigationButton href="/admin/blog" pendingLabel="Loading articles" className="min-h-11">
              First page
            </NavigationButton>
          }
        />
      )}
      <BlogPagination base="/admin/blog" page={page} total={listing.total} />
    </main>
  );
}
