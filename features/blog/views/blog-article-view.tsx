import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NavigationButton } from "@/components/shared/navigation-button";
import { getPublicArticle } from "../lib/get-blog-data";
import { formatArticleDate, articleReadingMinutes } from "../lib/article-format";
import { BLOG_CATEGORIES } from "../constants/blog-categories";
import { BlogHeader } from "../components/blog-header";
import { ArticleBody } from "../components/article-body";
import styles from "../components/blog.module.css";

type ArticlePageProps = { params: Promise<{ slug: string }> };

/** Metadata follows the same published-only lookup as the page; drafts remain 404. */
export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = await getPublicArticle((await params).slug);
  if (!article) notFound();
  return {
    title: `${article.title} | Scripture Memo`,
    description: article.excerpt,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      authors: [article.byline],
    },
  };
}

/** Searchable editorial reading experience, separate from gated Scripture Study. */
export async function BlogArticleView({ params }: ArticlePageProps): Promise<React.ReactNode> {
  const article = await getPublicArticle((await params).slug);
  if (!article) notFound();
  return (
    <div className={styles.page} lang="en">
      <BlogHeader />
      <main className={styles.readingPage}>
        <NavigationButton href="/blog" pendingLabel="Opening the journal" variant="outline" className="min-h-11">
          Back to the journal
        </NavigationButton>
        <article>
          <header className={styles.articleHeading}>
            <span className={styles.eyebrow}>{BLOG_CATEGORIES[article.category]}</span>
            <h1>{article.title}</h1>
            <p>{article.excerpt}</p>
            <div className={styles.meta}>
              <span>By {article.byline}</span>
              {article.publishedAt && <span>Published {formatArticleDate(article.publishedAt)}</span>}
              <span>Updated {formatArticleDate(article.updatedAt)}</span>
              <span>{articleReadingMinutes(article.content)} min read</span>
            </div>
          </header>
          <ArticleBody content={article.content} />
        </article>
        <footer className={styles.footer}>
          <NavigationButton href="/blog?category=GUIDE" pendingLabel="Opening guides" variant="outline" className="min-h-11">
            Explore game guides
          </NavigationButton>
        </footer>
      </main>
    </div>
  );
}
