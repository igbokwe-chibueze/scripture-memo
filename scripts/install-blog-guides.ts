/**
 * One-time installer for the owner-approved initial public blog guides.
 * Run with: node --conditions=react-server --import=tsx scripts/install-blog-guides.ts
 * Requires the existing migrated development DATABASE_URL in .env. Only the
 * established loopback listener on port 51214 is accepted; hosted/test databases
 * and production mode are rejected before importing the database repository.
 * Adds missing slugs and an audit record atomically; never overwrites articles,
 * deletes data, migrates schemas, or prints connection strings/raw errors.
 */
import "dotenv/config";

/** Validate the exact local target, install missing guides, and release the pool. */
async function main(): Promise<void> {
  const target = new URL(process.env.DATABASE_URL ?? "");
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
    target.port !== "51214" ||
    !["postgres:", "postgresql:"].includes(target.protocol)
  ) {
    throw new Error("Starter guides require the existing local development database.");
  }
  const repository = await import("@/features/blog/repositories/blog-seed.repository");
  try {
    const count = await repository.installStarterBlogArticles();
    process.stdout.write(`Installed ${count} new public blog articles. Existing articles preserved.\n`);
  } finally {
    await repository.closeBlogMaintenanceConnection();
  }
}

void main().catch(() => {
  process.stderr.write("Starter guide installation failed. Check the local database and blog migration.\n");
  process.exitCode = 1;
});
