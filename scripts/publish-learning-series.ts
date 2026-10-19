/**
 * Publish the twelve owner-approved learning articles to the existing LOCAL blog.
 * Run: npx tsx --conditions=react-server scripts/publish-learning-series.ts
 * Requires .env DATABASE_URL for development port 51214 and installed packages.
 * The target guard runs before repository imports and rejects hosted/test targets,
 * production mode, and connection host overrides. No migration/reset occurs.
 * Static Markdown is validated before mutation. Publication is audited atomically;
 * reruns preserve CMS revisions and the original long-form article's current state.
 * All source links are checked against the shared Markdown URL safety policy.
 * Safe errors omit credentials and raw database diagnostics.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { LEARNING_SERIES } from "../features/blog/data/learning-series";
import { saveBlogArticleSchema } from "../features/blog/schemas/save-blog-article.schema";
import { safeArticleUrl } from "../features/blog/lib/article-format";

/** Validate all sources, publish once, then confirm their public visibility. */
async function main(): Promise<void> {
  const target = new URL(process.env.DATABASE_URL ?? "");
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
    target.port !== "51214" ||
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    [...target.searchParams.keys()].some((key) => ![
      "sslmode", "schema", "connection_limit", "pool_timeout", "connect_timeout",
    ].includes(key))
  ) {
    throw new Error("Publication requires the established local development database.");
  }
  const slugs = new Set<string>(LEARNING_SERIES.map((article) => article.slug));
  const articles = await Promise.all(LEARNING_SERIES.map(async (metadata) => {
    const content = await readFile(resolve("features/blog/data", metadata.file), "utf8");
    for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
      const url = match[1];
      if (!safeArticleUrl(url)) throw new Error("Article contains an unsafe link.");
      if (url.startsWith("/blog/") && !slugs.has(url.slice(6))) {
        throw new Error("An internal series link has no matching article.");
      }
    }
    return saveBlogArticleSchema.parse({
      title: metadata.title,
      slug: metadata.slug,
      excerpt: metadata.excerpt,
      content,
      category: "BEHIND_SCENES",
      status: "PUBLISHED",
      byline: "Scripture Memo Team",
    });
  }));
  const repository = await import("../features/blog/repositories/blog-series.repository");
  try {
    const count = await repository.publishLearningSeries(articles);
    const { blogRepository } = await import("../features/blog/repositories/blog.repository");
    const published = await Promise.all(articles.map((article) => blogRepository.getPublishedArticle(article.slug)));
    if (published.some((article) => !article?.publishedAt)) {
      throw new Error("Public article verification failed.");
    }
    // The original long-form article is outside this batch. Its publication state
    // belongs to its editor and is deliberately neither checked nor modified here.
    process.stdout.write(`Published ${count} new articles; all ${articles.length} publicly readable.\n`);
    for (const article of articles) {
      process.stdout.write(`/blog/${article.slug} (${article.content.trim().split(/\s+/).length} words)\n`);
    }
  } finally {
    await repository.closeLearningSeriesConnection();
  }
}

void main().catch(() => {
  process.stderr.write("Learning-series publication failed. Check local access, source validation, or slug conflicts.\n");
  process.exitCode = 1;
});
