/**
 * Private mark ownership and concurrent upsert integrity on a disposable local
 * PostgreSQL instance. Run through the --bible embedded runner. The normal dev
 * URL is never used for fixtures; cleanup deletes only this run's random users.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

test("Bible marks are private, idempotent, paginated and preserve concurrent independent changes", async () => {
  process.env.DATABASE_URL = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl: process.env.DATABASE_URL,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
  });
  const { prisma } = await import("@/lib/prisma");
  const { bibleRepository } = await import("./bible.repository");
  const owner = randomUUID();
  const other = randomUUID();
  const reference = {
    book: "GEN",
    chapter: 1,
    verse: 3,
    translation: "KJV" as const,
  };
  try {
    await prisma.user.createMany({
      data: [owner, other].map((id) => ({
        id,
        name: "Bible fixture",
        email: `${id}@example.test`,
      })),
    });
    assert.deepEqual(await bibleRepository.chapterMarks(owner, reference), []);
    assert.equal(
      await prisma.bibleVerseMark.count({ where: { userId: owner } }),
      0,
      "Reads never initialize annotations.",
    );
    // Repeated concurrent writes must produce one row and preserve both fields.
    await Promise.all([
      bibleRepository.setMark(owner, {
        ...reference,
        operation: "bookmark",
        bookmarked: true,
      }),
      bibleRepository.setMark(owner, {
        ...reference,
        operation: "highlight",
        highlight: "gold",
      }),
    ]);
    const marks = await bibleRepository.chapterMarks(owner, reference);
    assert.equal(marks.length, 1);
    assert.equal(marks[0].bookmarked, true);
    assert.equal(marks[0].highlight, "gold");
    assert.deepEqual(await bibleRepository.chapterMarks(other, reference), []);
    assert.deepEqual(
      (await bibleRepository.saved(other, { page: 1, filter: "all" })).marks,
      [],
    );
    await bibleRepository.setMark(owner, {
      ...reference,
      operation: "bookmark",
      bookmarked: false,
    });
    assert.equal(
      (await bibleRepository.saved(owner, { page: 1, filter: "bookmarks" }))
        .marks.length,
      0,
    );
    assert.equal(
      (await bibleRepository.saved(owner, { page: 1, filter: "highlights" }))
        .marks.length,
      1,
    );
    await bibleRepository.setMark(owner, {
      ...reference,
      operation: "highlight",
      highlight: null,
    });
    assert.equal(
      (await bibleRepository.saved(owner, { page: 1, filter: "all" })).marks
        .length,
      0,
    );
    for (let verse = 1; verse <= 22; verse += 1) {
      await bibleRepository.setMark(owner, {
        ...reference,
        verse,
        operation: "bookmark",
        bookmarked: true,
      });
    }
    const first = await bibleRepository.saved(owner, {
      page: 1,
      filter: "all",
    });
    const second = await bibleRepository.saved(owner, {
      page: 2,
      filter: "all",
    });
    assert.equal(first.marks.length, 20);
    assert.equal(first.hasNext, true);
    assert.equal(second.marks.length, 2);
    assert.equal(second.hasNext, false);
    assert.equal(
      new Set([...first.marks, ...second.marks].map((mark) => mark.verse)).size,
      22,
    );
    await prisma.user.deleteMany({ where: { id: owner } });
    assert.equal(
      await prisma.bibleVerseMark.count({ where: { userId: owner } }),
      0,
      "Account deletion cascades private marks.",
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [owner, other] } } });
    await prisma.$disconnect();
  }
});
