/**
 * Real PostgreSQL coverage for social authorization, privacy and concurrent writes.
 * Requires the isolated local TEST_DATABASE_URL and guard acknowledgement. Refuses
 * development/hosted databases; removes only this run's fixture accounts and limits.
 * No routine production or learner data is used, reset or seeded.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";
import { PlayerSocialConflictError } from "@/lib/errors/player-social-error";
import { usernameSchema } from "@/features/profile/schemas/username.schema";

const applicationDatabaseUrl = process.env.DATABASE_URL;

test("handles and friendships preserve identity, consent, privacy and concurrency", {
  skip: process.env.TEST_DATABASE_URL ? false : "Isolated local test URL required.",
}, async () => {
  process.env.DATABASE_URL = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
  });
  const { prisma } = await import("@/lib/prisma");
  const { friendRepository } = await import("./friend.repository");
  const { playerProfileRepository } = await import("@/features/profile/repositories/player-profile.repository");
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const [a, b, c] = ids;
  let started = false;
  try {
    assert.equal(await prisma.user.count(), 0, "The local test fixture users must be empty.");
    started = true;
    for (const id of ids) {
      await prisma.user.create({
        data: {
          id,
          name: "Shared display name",
          email: `${id}@example.test`,
          profile: { create: { displayName: "Shared display name", totalGlowPoints: 777, beaconXp: 540 } },
        },
      });
    }
    const profiles = await prisma.userProfile.findMany({ where: { userId: { in: ids } } });
    const ap = profiles.find((row) => row.userId === a)!;
    const bp = profiles.find((row) => row.userId === b)!;
    const cp = profiles.find((row) => row.userId === c)!;
    assert.ok(profiles.every((row) => row.username === null));

    // Two accounts claiming case variants race for the same canonical handle.
    const claims = await Promise.allSettled([
      playerProfileRepository.updateUsername(a, usernameSchema.parse("Amara_Grace")),
      playerProfileRepository.updateUsername(b, usernameSchema.parse("AMARA_GRACE")),
    ]);
    assert.equal(claims.filter((result) => result.status === "fulfilled").length, 1);
    const winner = claims[0].status === "fulfilled" ? a : b;
    await assert.rejects(playerProfileRepository.updateUsername(winner, "another_name"), PlayerSocialConflictError);
    await playerProfileRepository.updateUsername(winner, "amara_grace");

    await Promise.all(Array.from({ length: 6 }, () => friendRepository.mutate(a, bp.publicId, "request")));
    assert.equal(await prisma.playerFriendship.count(), 1);
    assert.equal(await prisma.userNotification.count({ where: { type: "FRIEND_REQUEST", userId: b } }), 1);
    await assert.rejects(friendRepository.mutate(a, bp.publicId, "accept"), PlayerSocialConflictError);
    await assert.rejects(friendRepository.mutate(b, ap.publicId, "request"), PlayerSocialConflictError);
    await assert.rejects(friendRepository.mutate(c, ap.publicId, "accept"), PlayerSocialConflictError);
    await assert.rejects(friendRepository.mutate(a, ap.publicId, "request"), PlayerSocialConflictError);
    assert.equal((await friendRepository.getPage(b, { tab: "requests", q: "", page: 1 }))?.players[0]?.relationship, "incoming");

    await Promise.all(Array.from({ length: 3 }, () => friendRepository.mutate(b, ap.publicId, "accept")));
    assert.equal(await prisma.playerFriendship.count({ where: { status: "ACCEPTED" } }), 1);
    assert.equal(await prisma.userNotification.count({ where: { type: "FRIEND_ACCEPTED", userId: a } }), 1);
    const page = await friendRepository.getPage(a, { tab: "friends", q: "", page: 1 });
    assert.equal(page?.players[0]?.publicId, bp.publicId);
    assert.equal(page?.players[0]?.relationship, "friends");
    const publicProfile = await playerProfileRepository.getProfile(a, bp.publicId);
    assert.equal(publicProfile?.privateDetails, null, "Other players never receive private counts or avatar inventory.");
    const ownProfile = await playerProfileRepository.getProfile(a, ap.publicId);
    assert.equal(ownProfile?.privateDetails?.friends, 1);
    assert.equal(ownProfile?.privateDetails?.availableAvatars.length, 3);
    // A handle rejection must roll back unrelated fields in the same dialog save.
    await assert.rejects(playerProfileRepository.editProfile(winner, {
      displayName: "Must not save", countryCode: "NG", avatarKey: "lion", username: "cooldown_change",
    }), PlayerSocialConflictError);
    assert.equal((await prisma.userProfile.findUnique({ where: { userId: winner } }))?.displayName, "Shared display name");
    await assert.rejects(playerProfileRepository.editProfile(c, {
      displayName: "Unowned avatar", countryCode: "NG", avatarKey: "fox",
    }), PlayerSocialConflictError);
    await playerProfileRepository.editProfile(winner, {
      displayName: "Shared display name", countryCode: "NG", avatarKey: "dove", username: "amara_grace",
    });
    assert.equal((await prisma.userProfile.findUnique({ where: { userId: winner } }))?.avatarKey, "dove");
    assert.equal(publicProfile?.lifetimeBeaconXp, 540);
    for (const forbidden of ["userId", "email", "totalGlowPoints", "friends", "notes"]) {
      assert.equal(forbidden in (publicProfile ?? {}), false, forbidden);
      assert.equal(forbidden in (page?.players[0] ?? {}), false, forbidden);
    }

    // Handle edits preserve the UUID and accepted friendship permanently.
    await prisma.userProfile.update({
      where: { userId: winner },
      data: { usernameChangedAt: new Date(Date.now() - 31 * 86_400_000) },
    });
    await playerProfileRepository.updateUsername(winner, "renamed_learner");
    assert.equal((await prisma.userProfile.findUniqueOrThrow({ where: { userId: a } })).publicId, ap.publicId);
    assert.equal(await prisma.playerFriendship.count({ where: { status: "ACCEPTED" } }), 1);
    const search = await friendRepository.getPage(c, { tab: "search", q: "@RENAMED_LEARNER", page: 1 });
    assert.equal(search?.players.length, 1);
    assert.equal((await friendRepository.getPage(c, { tab: "search", q: "__", page: 1 }))?.players.length, 0);

    // Blocking wins regardless of transaction order against an acceptance retry.
    const blockRace = await Promise.allSettled([
      friendRepository.mutate(a, bp.publicId.toUpperCase(), "block"),
      friendRepository.mutate(b, ap.publicId, "accept"),
    ]);
    assert.equal(blockRace[0].status, "fulfilled", String(blockRace[0].status === "rejected" ? blockRace[0].reason : ""));
    assert.equal(await prisma.playerFriendship.count(), 0);
    assert.equal(await playerProfileRepository.getProfile(a, bp.publicId), null);
    assert.equal(await playerProfileRepository.getProfile(b, ap.publicId), null);
    assert.equal((await friendRepository.getPage(b, { tab: "search", q: "Shared", page: 1 }))?.players.some((row) => row.publicId === ap.publicId), false);
    await assert.rejects(friendRepository.mutate(b, ap.publicId, "request"), PlayerSocialConflictError);
    await friendRepository.mutate(b, ap.publicId, "unblock");
    assert.equal(await prisma.playerBlock.count(), 1, "A player cannot remove somebody else's block.");
    assert.equal(await prisma.userNotification.count(), 0, "Blocking removes old notices between the pair.");
    await friendRepository.mutate(a, bp.publicId, "unblock");
    assert.equal(await prisma.playerFriendship.count(), 0, "Unblocking never recreates friendship.");

    await friendRepository.mutate(b, ap.publicId, "request");
    await assert.rejects(friendRepository.mutate(a, bp.publicId, "cancel"), PlayerSocialConflictError);
    await friendRepository.mutate(b, ap.publicId, "cancel");
    await friendRepository.mutate(a, bp.publicId, "request");
    await friendRepository.mutate(b, ap.publicId, "decline");
    assert.equal(await prisma.playerFriendship.count(), 0);
    await friendRepository.mutate(a, bp.publicId, "request");
    await friendRepository.mutate(b, ap.publicId, "accept");
    await friendRepository.mutate(a, bp.publicId, "unfriend");
    assert.equal(await prisma.playerFriendship.count(), 0);

    await prisma.rateLimit.upsert({
      where: { key: `player-friend-requests:${a}` },
      create: { key: `player-friend-requests:${a}`, count: 30, lastRequest: BigInt(Date.now()) },
      update: { count: 30, lastRequest: BigInt(Date.now()) },
    });
    await assert.rejects(friendRepository.mutate(a, cp.publicId, "request"), PlayerSocialConflictError);
    await friendRepository.mutate(c, bp.publicId, "block");
    await prisma.user.update({ where: { id: b }, data: { banned: true } });
    assert.equal(await playerProfileRepository.getProfile(c, bp.publicId), null);
    await assert.rejects(friendRepository.mutate(c, bp.publicId, "request"), PlayerSocialConflictError);
    await friendRepository.mutate(c, bp.publicId, "unblock");
    assert.equal(await prisma.playerBlock.count(), 0, "The owner can remove a block of a suspended player.");
  } finally {
    if (started) {
      await prisma.rateLimit.deleteMany({ where: { key: { in: ids.map((id) => `player-friend-requests:${id}`) } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  }
});
