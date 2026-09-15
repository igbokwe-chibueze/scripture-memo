/**
 * Real PostgreSQL coverage for Fellowship detail visibility and public DTOs.
 * Run with `npx.cmd tsx --conditions=react-server --test
 * features/fellowships/repositories/fellowship.repository.test.ts`.
 *
 * Requires a migrated TEST_DATABASE_URL and the shared test acknowledgement.
 * The application URL is never used as a fallback. Empty-table checks precede
 * all fixtures; cleanup targets only this run's IDs, in foreign-key order.
 * No login sessions, rewards, or existing learner records are modified.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import "dotenv/config";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

test("Fellowship detail preserves leader review and private membership boundaries", {
  skip: process.env.TEST_DATABASE_URL ? false : "TEST_DATABASE_URL is not configured.",
}, async () => {
  const applicationUrl = process.env.DATABASE_URL;
  const testUrl = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl: applicationUrl,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
  });

  // Credentials or query parameters alone do not identify a different database.
  // Strengthen the shared URL-string check before importing the singleton.
  if (applicationUrl) {
    const application = new URL(applicationUrl);
    const isolated = new URL(testUrl);
    assert.ok(
      application.hostname !== isolated.hostname ||
      (application.port || "5432") !== (isolated.port || "5432") ||
      application.pathname !== isolated.pathname,
      "Tests require a separate database, not different credentials for the app database.",
    );
  }
  process.env.DATABASE_URL = testUrl;
  const { prisma } = await import("@/lib/prisma");
  const { fellowshipRepository } = await import("./fellowship.repository");
  const runId = randomUUID();
  const userIds = ["leader", "member", "visitor"].map((role) => `${role}-${runId}`);
  const [leaderId, memberId, visitorId] = userIds;
  const fellowshipIds = [`public-${runId}`, `private-${runId}`];
  let fixturesStarted = false;

  try {
    // Fail closed before writes when the resource contains unrelated fixtures.
    for (const count of [
      await prisma.user.count(),
      await prisma.userProfile.count(),
      await prisma.fellowship.count(),
      await prisma.fellowshipMember.count(),
      await prisma.fellowshipJoinRequest.count(),
    ]) {
      assert.equal(count, 0, "Fellowship integration fixture tables must be empty.");
    }
    fixturesStarted = true;
    for (const [index, id] of userIds.entries()) {
      await prisma.user.create({
        data: {
          id,
          name: `Test player ${index}`,
          email: `${id}@example.test`,
          profile: {
            create: {
              displayName: `Test player ${index}`,
              totalWaypointsCompleted: index,
            },
          },
        },
      });
    }
    for (const [index, id] of fellowshipIds.entries()) {
      await prisma.fellowship.create({
        data: {
          id,
          slug: id,
          name: id,
          isPublic: index === 0,
          createdById: leaderId,
          inviteCode: `invite-${id}`,
          members: { create: [{ userId: leaderId }, { userId: memberId }] },
          joinRequests: { create: { userId: visitorId, source: "DIRECTORY" } },
        },
      });
      const leader = await fellowshipRepository.getDetail(leaderId, id);
      assert.ok(leader);
      assert.equal(leader.isLeader, true);
      assert.equal(leader.joinRequests.length, 1);
      assert.equal(leader.joinRequests[0].status, "PENDING");
      assert.equal(leader.inviteCode, `invite-${id}`);
      assert.equal(leader.memberCount, 2);
      assert.equal(leader.members[0].displayName, "Test player 1");

      const member = await fellowshipRepository.getDetail(memberId, id);
      assert.ok(member);
      assert.equal(member.isMember, true);
      assert.equal(member.isLeader, false);
      assert.deepEqual(member.joinRequests, []);
      assert.equal(member.inviteCode, null);
      // Public roster entries must not serialize auth identity or contact data.
      for (const entry of member.members) {
        assert.equal("email" in entry, false);
        assert.equal("userId" in entry, false);
      }

      const visitor = await fellowshipRepository.getDetail(visitorId, id);
      if (index === 0) {
        assert.ok(visitor);
        assert.equal(visitor.isMember, false);
        assert.deepEqual(visitor.joinRequests, []);
        assert.equal(visitor.inviteCode, null);
      } else {
        assert.equal(visitor, null);
      }
    }
    assert.equal(await fellowshipRepository.getDetail(visitorId, `missing-${runId}`), null);
  } finally {
    // Cascade removes only these fellowships' requests/members and users'
    // profiles. Disconnect even if cleanup fails so the test cannot hang.
    try {
      if (fixturesStarted) {
        await prisma.fellowship.deleteMany({ where: { id: { in: fellowshipIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
