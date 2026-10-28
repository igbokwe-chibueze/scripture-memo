/** Real PostgreSQL tests on the disposable --bible runner, never hosted/dev data.
 * Prove atomic throttling, inactivity eligibility, privacy and plan isolation.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

test("plan participation is private, daily-throttled, resumable and excludes inactive/finished readers", async () => {
  process.env.DATABASE_URL = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl: process.env.DATABASE_URL,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
  });
  const { prisma } = await import("@/lib/prisma");
  const { readingPlanParticipationRepository: repository } =
    await import("./reading-plan-participation.repository");
  const users = Array.from({ length: 9 }, () => randomUUID());
  const [owner, viewer, blocked, banned, suspended, inactive, completed] =
    users;
  const now = new Date("2026-10-28T12:00:00.000Z");
  const planId = "new-testament" as const;
  try {
    await prisma.user.createMany({
      data: users.map((id) => ({
        id,
        name: "Plan fixture",
        email: `${id}@example.test`,
      })),
    });
    await prisma.userProfile.createMany({
      data: users.map((userId, index) => ({
        userId,
        displayName: `Reader ${index}`,
        avatarKey: index % 2 ? "owl" : "lion",
      })),
    });
    assert.deepEqual(await repository.summary(viewer, planId, now), {
      total: 0,
      avatars: [],
    });
    assert.equal(
      await prisma.readingPlanParticipation.count(),
      0,
      "Ordinary reads never create participants.",
    );
    await repository.update(owner, { planId, operation: "start" }, now);
    // The SQL predicate, not a browser gate, owns at-most-once daily activity.
    const later = new Date("2026-10-28T23:59:59Z");
    await Promise.all(
      Array.from({ length: 8 }, () =>
        repository.update(owner, { planId, operation: "activity" }, later),
      ),
    );
    let row = await prisma.readingPlanParticipation.findUniqueOrThrow({
      where: { userId_planId: { userId: owner, planId } },
    });
    assert.equal(row.lastActiveAt.toISOString(), now.toISOString());
    const tomorrow = new Date("2026-10-29T00:00:01Z");
    await repository.update(owner, { planId, operation: "activity" }, tomorrow);
    row = await prisma.readingPlanParticipation.findUniqueOrThrow({
      where: { userId_planId: { userId: owner, planId } },
    });
    assert.equal(row.lastActiveAt.toISOString(), tomorrow.toISOString());
    await repository.update(owner, { planId, operation: "complete" }, tomorrow);
    assert.equal((await repository.summary(viewer, planId, tomorrow)).total, 0);
    await repository.update(owner, { planId, operation: "start" }, tomorrow);
    assert.equal(
      (await repository.summary(viewer, planId, tomorrow)).total,
      0,
      "Opening a completed plan never rejoins it.",
    );
    await repository.update(owner, { planId, operation: "activity" }, tomorrow);
    assert.equal(
      (await repository.summary(viewer, planId, tomorrow)).total,
      1,
      "Undoing completion resumes participation.",
    );
    for (const user of users.slice(1))
      await repository.update(user, { planId, operation: "start" }, now);
    await prisma.playerBlock.create({
      data: { blockerId: blocked, blockedId: viewer },
    });
    await prisma.user.update({ where: { id: banned }, data: { banned: true } });
    await prisma.user.update({
      where: { id: suspended },
      data: { suspendedAt: now },
    });
    await prisma.readingPlanParticipation.update({
      where: { userId_planId: { userId: inactive, planId } },
      data: { lastActiveAt: new Date("2026-09-27T12:00:00Z") },
    });
    await repository.update(completed, { planId, operation: "complete" }, now);
    const preview = await repository.summary(viewer, planId, now);
    assert.equal(preview.total, 4);
    assert.equal(preview.avatars.length, 4);
    assert.ok(
      preview.avatars.every(
        (avatar) => !Object.keys(avatar).includes("userId"),
      ),
    );
    assert.deepEqual(
      Object.keys(preview.avatars[0]).sort(),
      ["publicId", "displayName", "avatarKey", "avatarFrameKey"].sort(),
    );
    assert.equal(
      (await repository.summary(viewer, "old-testament", now)).total,
      0,
    );
    await repository.update(inactive, { planId, operation: "start" }, now);
    assert.equal(
      (await repository.summary(viewer, planId, now)).total,
      4,
      "Opening an inactive plan does not revive activity.",
    );
    await repository.update(inactive, { planId, operation: "activity" }, now);
    assert.equal((await repository.summary(viewer, planId, now)).total, 5);
    assert.equal(
      (await repository.summary(viewer, planId, now)).avatars.length,
      4,
    );
    await repository.update(
      owner,
      { planId: "old-testament", operation: "start" },
      now,
    );
    await repository.update(owner, { planId, operation: "reset" }, now);
    assert.equal((await repository.summary(viewer, planId, now)).total, 4);
    assert.equal(
      (await repository.summary(viewer, "old-testament", now)).total,
      1,
    );
    await prisma.user.delete({ where: { id: owner } });
    assert.equal(
      await prisma.readingPlanParticipation.count({ where: { userId: owner } }),
      0,
    );
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
