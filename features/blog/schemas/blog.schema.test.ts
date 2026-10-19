import assert from "node:assert/strict";
import test from "node:test";
import { saveBlogArticleSchema } from "./save-blog-article.schema";
import { blogSearchSchema } from "./blog-search.schema";
import { safeArticleUrl } from "../lib/article-format";
import { STARTER_ARTICLES } from "../data/starter-articles";

const draft = {
  title: "A draft article",
  slug: "a-draft-article",
  excerpt: "",
  content: "",
  category: "GUIDE",
  status: "DRAFT",
  byline: "Scripture Memo",
} as const;

test("drafts allow unfinished text but publication requires useful summary and body", () => {
  assert.equal(saveBlogArticleSchema.safeParse(draft).success, true);
  assert.equal(saveBlogArticleSchema.safeParse({ ...draft, status: "PUBLISHED" }).success, false);
  assert.equal(saveBlogArticleSchema.safeParse(STARTER_ARTICLES[0]).success, true);
});

test("editor inputs reject unpaired versions, invalid slugs, and oversized bodies", () => {
  for (const input of [
    { ...draft, id: "article" },
    { ...draft, version: 1 },
    { ...draft, id: "article", version: -1 },
    { ...draft, slug: "../admin" },
    { ...draft, slug: "https://example.com" },
    { ...draft, content: "x".repeat(60_001) },
    { ...draft, category: "UNKNOWN" },
  ]) {
    assert.equal(saveBlogArticleSchema.safeParse(input).success, false);
  }
});

test("public filters bound search length, page offsets, and allowed categories", () => {
  assert.deepEqual(blogSearchSchema.parse({ q: "x".repeat(101), category: "DRAFT", page: 1e10 }), {
    q: "", category: "ALL", page: 1,
  });
  assert.deepEqual(blogSearchSchema.parse({ q: " Beacon Levels ", category: "GUIDE", page: "2" }), {
    q: "Beacon Levels", category: "GUIDE", page: 2,
  });
});

test("Markdown links reject executable, protocol-relative, and credential-bearing URLs", () => {
  for (const unsafe of ["javascript:alert(1)", "data:text/html,test", "vbscript:run", "//example.com", "/\\example.com", "https://user:secret@example.com"]) {
    assert.equal(safeArticleUrl(unsafe), undefined);
  }
  assert.equal(safeArticleUrl("/blog/beacon-levels-xp-progress-bar"), "/blog/beacon-levels-xp-progress-bar");
  assert.equal(safeArticleUrl("https://example.com"), "https://example.com/");
});

test("starter articles have unique valid slugs and every internal article link resolves", () => {
  const slugs = new Set(STARTER_ARTICLES.map((article) => article.slug));
  assert.equal(slugs.size, STARTER_ARTICLES.length);
  for (const article of STARTER_ARTICLES) {
    assert.equal(saveBlogArticleSchema.safeParse(article).success, true);
    for (const match of article.content.matchAll(/\]\(\/blog\/([a-z0-9-]+)\)/g)) {
      assert.equal(slugs.has(match[1]), true, `Missing linked article: ${match[1]}`);
    }
  }
});
