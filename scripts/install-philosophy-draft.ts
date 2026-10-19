/**
 * Install the owner's researched long-form article as a PRIVATE local CMS draft.
 * Run: npx tsx --conditions=react-server scripts/install-philosophy-draft.ts
 * Requires installed dependencies and .env DATABASE_URL for development 51214.
 * Rejects production/hosted/test listeners before any repository import; never
 * migrates, resets, publishes, or overwrites an article. Static Markdown is the
 * reviewable editorial source; PostgreSQL is the CMS source of truth thereafter.
 * A repeated run preserves CMS revisions. Errors omit database credentials.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { saveBlogArticleSchema } from "../features/blog/schemas/save-blog-article.schema";

/** Validate source/target, import through its repository, and release the pool. */
async function main(): Promise<void> {
  const target = new URL(process.env.DATABASE_URL ?? "");
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
    target.port !== "51214" ||
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    [...target.searchParams.keys()].some((key) => !["sslmode", "schema", "connection_limit", "pool_timeout", "connect_timeout"].includes(key))
  ) {
    throw new Error("Editorial import requires the established local development database.");
  }
  const content = await readFile(resolve("features/blog/data/why-scripture-memo-exists.md"), "utf8");
  const draft = saveBlogArticleSchema.parse({
    title: "Why Scripture Memo Exists: Our Philosophy and the Science of Remembering Scripture",
    slug: "why-scripture-memo-exists-science-of-remembering",
    excerpt: "Our philosophy, the learning science behind spacing and recall, and how Scripture Memo's challenges, five modes, and returning verses are designed to help you remember Scripture thoughtfully over time.",
    content,
    category: "BEHIND_SCENES",
    status: "DRAFT",
    byline: "Scripture Memo Team",
  });
  const repository = await import("../features/blog/repositories/blog-draft-import.repository");
  try {
    const result = await repository.importEditorialDraft(draft);
    const words = content.trim().split(/\s+/).length;
    process.stdout.write(`${result.created ? "Created private draft" : "Preserved existing article"}: /admin/blog/${result.id}\n${words} words; approximately ${Math.ceil(words / 200)} minutes.\n`);
  } finally {
    await repository.closeEditorialImportConnection();
  }
}

void main().catch(() => {
  process.stderr.write("Editorial draft import failed. Check the local database and article validation.\n");
  process.exitCode = 1;
});
