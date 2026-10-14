import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NavigationButton } from "@/components/shared/navigation-button";
import { EmptyState } from "@/components/shared/empty-state";
import { getPublicBlogData, type BlogSearchParams } from "../lib/get-blog-data";
import { formatArticleDate } from "../lib/article-format";
import { BLOG_CATEGORIES } from "../constants/blog-categories";
import { BlogHeader } from "../components/blog-header";
import { BlogSearchForm } from "../components/blog-search-form";
import { BlogPagination } from "../components/blog-pagination";
import styles from "../components/blog.module.css";

export const metadata: Metadata = {
  title: "Journal & Game Guides | Scripture Memo",
  description: "Understand Scripture Memo: searchable game guides, announcements, design, and engineering stories.",
};

const categoryArtwork = {
  GUIDE: "bible-open",
  NEWS: "daily-challenge",
  BEHIND_SCENES: "settings",
} as const;

/** Public reading/search surface renders published summaries only, without auth. */
export async function BlogIndexView({
  searchParams,
}: {
  searchParams: Promise<BlogSearchParams>;
}): Promise<React.ReactNode> {
  const { search, listing } = await getPublicBlogData(await searchParams);
  const listingTitle = search.q
    ? `Results for “${search.q}”`
    : search.category === "ALL"
      ? "Explore the journal"
      : BLOG_CATEGORIES[search.category];
  return (
    <div className={styles.page} lang="en">
      <BlogHeader />
      <main className={styles.container}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>The Scripture Memo Journal</p>
          <h1>A little clarity for every step.</h1>
          <p>Find out how the game works, catch up on what’s new, and discover the care behind your Scripture journey.</p>
        </section>
        <BlogSearchForm key={`${search.q}:${search.category}`} search={search} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-2xl font-bold">
            {listingTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{listing.total} articles</p>
        </div>
        {listing.articles.length ? (
          <div className={styles.articleGrid}>
            {listing.articles.map((article) => (
              <article key={article.id} className={styles.articleCard}>
                <div className={styles.cardArtwork} aria-hidden="true">
                  <Image src={`/images/game-ui/${categoryArtwork[article.category]}.png`} alt="" width={120} height={120} />
                </div>
                <span className={styles.eyebrow}>{BLOG_CATEGORIES[article.category]}</span>
                <h2>
                  <Link href={`/blog/${article.slug}`}>{article.title}</Link>
                </h2>
                <p>{article.excerpt}</p>
                <div className={styles.meta}>
                  <span>{article.byline}</span>
                  <span>Updated {formatArticleDate(article.updatedAt)}</span>
                </div>
                <NavigationButton
                  href={`/blog/${article.slug}`}
                  pendingLabel="Opening article"
                  variant="outline"
                  className="min-h-11"
                >
                  Read article
                </NavigationButton>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No articles found"
            description="Try a shorter search or a different category. New articles appear here when published."
            className="my-6"
            action={
              <NavigationButton href="/blog" pendingLabel="Loading articles" variant="outline" className="min-h-11">
                Browse all articles
              </NavigationButton>
            }
          />
        )}
        <BlogPagination base="/blog" page={search.page} total={listing.total} q={search.q} category={search.category} />
        <footer className={styles.footer}>Scripture Memo · Learn, remember, and grow.</footer>
      </main>
    </div>
  );
}
