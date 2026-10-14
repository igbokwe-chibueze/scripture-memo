/**
 * Persistence/security acceptance against the separately guarded local test DB.
 * Never falls back to the application's URL. Fixtures are unique and removed
 * narrowly; unrelated data is rejected before writes rather than reset.
 * Run via node --conditions=react-server --import=tsx --test this file.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const applicationDatabaseUrl = process.env.DATABASE_URL;

test("draft privacy, search, audited publication, stable URLs, and stale-save protection", {
  skip: testDatabaseUrl ? false : "TEST_DATABASE_URL is not configured.",
}, async () => {
  if (!testDatabaseUrl) return;
  process.env.DATABASE_URL = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl,
    testDatabaseUrl,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
  });
  const { prisma } = await import("@/lib/prisma");
  const { blogRepository, BlogSaveConflict } = await import("./blog.repository");
  const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const actorId = `blog-test-${run}`;
  const slug = `blog-test-${run}`;
  try {
    assert.equal(await prisma.user.count(), 0, "Test users must be empty.");
    assert.equal(await prisma.blogArticle.count(), 0, "Test articles must be empty.");
    await prisma.user.create({
      data: { id: actorId, name: "Editorial test", email: `${actorId}@example.test`, role: "ADMIN" },
    });
    const draft = await blogRepository.save({
      title: "Beacon privacy probe",
      slug,
      excerpt: "A publication-boundary integration fixture.",
      content: "A unique search phrase: tiny lamp. This article is synthetic test content and must never appear in the real journal.",
      category: "GUIDE",
      status: "DRAFT",
      byline: "Test editorial team",
    }, actorId);
    assert.equal(await blogRepository.getPublishedArticle(slug), null);
    assert.equal((await blogRepository.listPublished({ q: "", category: "ALL", page: 1 })).total, 0);
    assert.equal((await blogRepository.getForAdmin(draft.id))?.status, "DRAFT");

    const published = await blogRepository.save({ ...draft, status: "PUBLISHED" }, actorId);
    assert.ok(published.publishedAt);
    assert.equal(published.version, 2);
    assert.equal((await blogRepository.getPublishedArticle(slug))?.status, "PUBLISHED");
    const found = await blogRepository.listPublished({ q: "TINY lamp", category: "GUIDE", page: 1 });
    assert.equal(found.total, 1);
    assert.equal("content" in found.articles[0], false, "Public listings omit article bodies.");
    assert.equal((await blogRepository.listPublished({ q: "", category: "NEWS", page: 1 })).total, 0);
    assert.equal(await prisma.auditLog.count({ where: { actorId } }), 2);

    await assert.rejects(
      blogRepository.save({ ...draft, id: undefined, version: undefined }, actorId),
      (error: unknown) => error instanceof Error && "code" in error && error.code === "P2002",
    );
    await prisma.$disconnect();

    await assert.rejects(
      blogRepository.save({ ...draft, title: "Stale overwrite" }, actorId),
      (error: unknown) => error instanceof BlogSaveConflict && error.reason === "STALE",
    );
    await prisma.$disconnect();
    await assert.rejects(
      blogRepository.save({ ...published, slug: `${slug}-changed` }, actorId),
      (error: unknown) => error instanceof BlogSaveConflict && error.reason === "SLUG",
    );
    await prisma.$disconnect();
    assert.equal(await prisma.auditLog.count({ where: { actorId } }), 2, "Rejected saves do not audit or mutate.");
    const unpublished = await blogRepository.save({ ...published, status: "DRAFT" }, actorId);
    assert.equal(unpublished.version, 3);
    assert.equal(unpublished.publishedAt?.toISOString(), published.publishedAt?.toISOString());
    assert.equal(await blogRepository.getPublishedArticle(slug), null);
    assert.equal((await blogRepository.listPublished({ q: "", category: "ALL", page: 1 })).total, 0);
  } finally {
    // Disconnect after expected rollback errors before issuing local cleanup.
    await prisma.$disconnect();
    await prisma.auditLog.deleteMany({ where: { actorId } });
    await prisma.blogArticle.deleteMany({ where: { slug } });
    await prisma.user.deleteMany({ where: { id: actorId } });
    await prisma.$disconnect();
  }
});
