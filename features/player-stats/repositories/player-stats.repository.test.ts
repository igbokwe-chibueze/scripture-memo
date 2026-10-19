/**
 * Real read-only analytics checks on the isolated local test listener. Fixture
 * writes are limited to this test's random IDs; no production/dev URL fallback,
 * broad reset, balance mutation through analytics or persistent seed is allowed.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const applicationDatabaseUrl = process.env.DATABASE_URL;

test(
  "private stats aggregate real history, ignore admin tests and honor local calendar days",
  {
    skip: process.env.TEST_DATABASE_URL
      ? false
      : "Isolated local test URL required.",
  },
  async () => {
    process.env.DATABASE_URL = requireSafeTestDatabaseUrl({
      applicationDatabaseUrl,
      testDatabaseUrl: process.env.TEST_DATABASE_URL,
      confirmation: process.env.TEST_DATABASE_CONFIRMATION,
    });
    const { prisma } = await import("@/lib/prisma");
    const { playerStatsRepository } = await import("./player-stats.repository");
    const userIds = [randomUUID(), randomUUID()];
    const [ownerId, otherId] = userIds;
    const verseIds = [randomUUID(), randomUUID()];
    const badgeIds = [randomUUID(), randomUUID()];
    const itemIds = [randomUUID(), randomUUID()];
    const weekIds = [randomUUID(), randomUUID()];
    const waypointIds: string[] = [];
    const now = new Date("2026-01-02T12:00:00Z");
    let started = false;
    try {
      assert.equal(
        await prisma.user.count(),
        0,
        "The isolated fixture users must be empty.",
      );
      started = true;
      for (const id of userIds) {
        await prisma.user.create({
          data: {
            id,
            name: "Stats test",
            email: `${id}@example.test`,
            createdAt: new Date("2024-01-01T00:00:00Z"),
            profile: {
              create: {
                displayName: "Stats test",
                totalGlowPoints: id === ownerId ? 1050 : 999,
                beaconXp: 540,
                beaconLevel: 4,
              },
            },
            settings: { create: { timeZone: "America/Los_Angeles" } },
            streak: { create: { currentStreak: 3, bestStreak: 10 } },
          },
        });
      }
      await prisma.verse.createMany({
        data: [
          {
            id: verseIds[0],
            reference: `John 3:16 ${verseIds[0]}`,
            book: "John",
            chapter: 3,
            verseStart: 16,
          },
          {
            id: verseIds[1],
            reference: `Psalms 119:105 ${verseIds[1]}`,
            book: "Psalms",
            chapter: 119,
            verseStart: 105,
          },
        ],
      });
      const maximum = await prisma.waypoint.aggregate({
        _max: { number: true },
      });
      let number = (maximum._max.number ?? 0) + 1;
      // A repeated Master waypoint must not become a fifth distinct mastery stage.
      for (const [verseId, stage] of [
        [verseIds[0], "LEARN"],
        [verseIds[0], "RECALL"],
        [verseIds[0], "STRENGTHEN"],
        [verseIds[0], "MASTER"],
        [verseIds[0], "MASTER"],
        [verseIds[1], "LEARN"],
      ] as const) {
        const waypoint = await prisma.waypoint.create({
          data: { verseId, journeyStage: stage, number: number++ },
        });
        waypointIds.push(waypoint.id);
        await prisma.userWaypointProgress.create({
          data: {
            userId: ownerId,
            waypointId: waypoint.id,
            status: "COMPLETED",
            completedAt: now,
          },
        });
      }
      await prisma.userWaypointProgress.create({
        data: {
          userId: otherId,
          waypointId: waypointIds[0],
          status: "COMPLETED",
          completedAt: now,
        },
      });
      for (const level of ["GLIMMER", "GLOW", "RADIANCE"] as const) {
        await prisma.userDayProgress.create({
          data: {
            userId: ownerId,
            waypointId: waypointIds[0],
            dayLevel: level,
            status: "COMPLETED",
            completedAt: now,
          },
        });
      }
      const learning = await prisma.gameSession.create({
        data: {
          userId: ownerId,
          verseId: verseIds[0],
          waypointId: waypointIds[0],
          translation: "KJV",
        },
      });
      const practice = await prisma.gameSession.create({
        data: {
          userId: ownerId,
          verseId: verseIds[0],
          isVaultReplay: true,
          translation: "WEB",
          status: "COMPLETED",
        },
      });
      const admin = await prisma.gameSession.create({
        data: { userId: ownerId, verseId: verseIds[0], isAdminTest: true },
      });
      const other = await prisma.gameSession.create({
        data: { userId: otherId, verseId: verseIds[0] },
      });
      const localDecember = new Date("2026-01-01T00:30:00Z");
      const localJanuary = new Date("2026-01-01T08:30:00Z");
      await prisma.gameModeAttempt.createMany({
        data: [
          {
            userId: ownerId,
            gameSessionId: learning.id,
            gameMode: "DRAG_DROP",
            status: "COMPLETED",
            completedAt: localDecember,
            durationMs: 60_000,
          },
          {
            userId: ownerId,
            gameSessionId: practice.id,
            gameMode: "CUE",
            status: "COMPLETED",
            completedAt: localJanuary,
            durationMs: 30_000,
          },
          {
            userId: ownerId,
            gameSessionId: learning.id,
            gameMode: "PUZZLE",
            status: "FAILED",
            completedAt: localJanuary,
            durationMs: 10_000,
          },
          {
            userId: ownerId,
            gameSessionId: learning.id,
            gameMode: "FILL",
            status: "EXPIRED",
            completedAt: localJanuary,
            durationMs: 120_000,
          },
          {
            userId: ownerId,
            gameSessionId: learning.id,
            gameMode: "SWAP",
            status: "IN_PROGRESS",
          },
          {
            userId: ownerId,
            gameSessionId: admin.id,
            gameMode: "FILL",
            status: "COMPLETED",
            completedAt: localJanuary,
            durationMs: 5000,
          },
          {
            userId: otherId,
            gameSessionId: other.id,
            gameMode: "FILL",
            status: "COMPLETED",
            completedAt: localJanuary,
            durationMs: 4000,
          },
        ],
      });
      await prisma.hintUsage.createMany({
        data: [
          {
            userId: ownerId,
            gameSessionId: learning.id,
            gameMode: "DRAG_DROP",
          },
          { userId: ownerId, gameSessionId: practice.id, gameMode: "CUE" },
          { userId: ownerId, gameSessionId: admin.id, gameMode: "FILL" },
        ],
      });
      await prisma.shopItem.createMany({
        data: [
          {
            id: itemIds[0],
            name: "Retired stats hints",
            slug: itemIds[0],
            description: "Fixture",
            itemType: "HINT_PACK",
            grantQuantity: 99,
            cost: 999,
            isActive: false,
          },
          {
            id: itemIds[1],
            name: "Stats avatar",
            slug: itemIds[1],
            description: "Fixture",
            itemType: "AVATAR",
            grantQuantity: 1,
            cost: 250,
          },
        ],
      });
      await prisma.userShopPurchase.create({
        data: {
          userId: ownerId,
          shopItemId: itemIds[0],
          unitCost: 120,
          totalCost: 120,
          entitlementQuantity: 7,
          idempotencyKey: randomUUID(),
        },
      });
      const avatarPurchase = await prisma.userShopPurchase.create({
        data: {
          userId: ownerId,
          shopItemId: itemIds[1],
          unitCost: 250,
          totalCost: 250,
          entitlementQuantity: 1,
          idempotencyKey: randomUUID(),
        },
      });
      await prisma.userAvatarOwnership.create({
        data: {
          userId: ownerId,
          avatarKey: "fox",
          purchaseId: avatarPurchase.id,
        },
      });
      await prisma.rewardLedger.createMany({
        data: [
          {
            userId: ownerId,
            amount: 200,
            eventType: "DAY_COMPLETE",
            reason: "Fixture",
            idempotencyKey: randomUUID(),
          },
          {
            userId: ownerId,
            amount: 100,
            eventType: "BADGE_UNLOCK",
            reason: "Fixture",
            idempotencyKey: randomUUID(),
          },
          {
            userId: ownerId,
            amount: 50,
            eventType: "MANUAL_ADMIN_AWARD",
            reason: "Fixture",
            idempotencyKey: randomUUID(),
          },
          {
            userId: ownerId,
            amount: -370,
            eventType: "SHOP_PURCHASE",
            reason: "Fixture",
            idempotencyKey: randomUUID(),
          },
        ],
      });
      for (const id of badgeIds) {
        await prisma.badge.create({
          data: {
            id,
            name: id,
            slug: id,
            description: "Fixture",
            category: "LEARNING",
            rarity: "RARE",
            criteriaKey: "STATS_TEST",
            targetValue: 1,
            isHidden: true,
            isActive: false,
          },
        });
      }
      await prisma.userBadgeProgress.create({
        data: {
          userId: ownerId,
          badgeId: badgeIds[0],
          progress: 1,
          status: "COMPLETED",
          unlockedAt: now,
        },
      });
      await prisma.userVerseNote.create({
        data: {
          userId: ownerId,
          verseId: verseIds[0],
          content: "This private content must never be returned.",
        },
      });
      await prisma.userFavoriteVerse.create({
        data: { userId: ownerId, verseId: verseIds[0] },
      });

      // Offset fixture windows avoid colliding with seeded production-shaped weeks.
      // Distinct league names prove ordering uses enum prestige rather than text.
      for (const [index, weekId] of weekIds.entries()) {
        const historical = index === 0;
        const league = historical ? "WATCHMAN" : "SAINT";
        await prisma.beaconWeek.create({
          data: {
            id: weekId,
            startsAt: new Date(
              historical ? "2025-12-22T01:02:03Z" : "2025-12-29T01:02:03Z",
            ),
            endsAt: new Date(
              historical ? "2025-12-29T01:02:03Z" : "2026-01-05T01:02:03Z",
            ),
          },
        });
        const cohort = await prisma.beaconLeagueCohort.create({
          data: { weekId, league, groupNumber: 1 },
        });
        await prisma.beaconLeagueMembership.create({
          data: {
            weekId,
            cohortId: cohort.id,
            userId: ownerId,
            league,
            finalRank: historical ? 1 : null,
          },
        });
        await prisma.beaconWeeklyScore.create({
          data: { weekId, userId: ownerId, points: historical ? 500 : 77 },
        });
      }
      const stats = await playerStatsRepository.getForPlayer(
        ownerId,
        "recent",
        now,
      );
      assert.ok(stats);
      assert.equal(stats.owner.glowBalance, 1050);
      assert.equal(stats.totals.journey.completedWaypoints, 6);
      assert.equal(stats.totals.journey.completedVerses, 2);
      assert.equal(stats.totals.journey.masteredVerses, 1);
      assert.equal(stats.totals.journey.notes, 1);
      assert.equal(stats.totals.journey.favorites, 1);
      assert.equal(stats.totals.days.length, 2);
      assert.deepEqual(stats.totals.days, [
        { date: "2025-12-31", learning: 1, practice: 0 },
        { date: "2026-01-01", learning: 0, practice: 1 },
      ]);
      assert.equal(
        stats.totals.modes.reduce((sum, mode) => sum + mode.completed, 0),
        2,
      );
      assert.equal(
        stats.totals.modes.find((mode) => mode.mode === "CUE")?.practice,
        1,
      );
      assert.equal(
        stats.totals.modes.find((mode) => mode.mode === "FILL")?.expired,
        1,
      );
      assert.equal(
        stats.totals.modes.find((mode) => mode.mode === "SWAP")?.inProgress,
        1,
      );
      assert.equal(stats.totals.sessions.learning, 1);
      assert.equal(stats.totals.sessions.practice, 1);
      assert.equal(stats.totals.inventory.hintUses, 2);
      assert.equal(stats.totals.inventory.practiceHints, 1);
      assert.equal(
        stats.totals.inventory.purchasedHints,
        7,
        "Retired purchases use the grant snapshot, not today's offer.",
      );
      assert.equal(stats.hintsRemaining, 10);
      assert.equal(stats.totals.inventory.ownedAvatars, 4);
      assert.deepEqual(stats.totals.beacon, {
        weeklyXp: 77,
        highestLeague: "SAINT",
        finishedWeeks: 1,
        weeklyWins: 1,
        bestRank: 1,
      });
      assert.deepEqual(stats.totals.rewards, {
        challengeGlow: 200,
        badgeGlow: 100,
        adminGlow: 50,
        glowSpent: 370,
      });
      assert.equal(stats.totals.badges[0].earned, 1);
      const otherStats = await playerStatsRepository.getForPlayer(
        otherId,
        "recent",
        now,
      );
      assert.ok(otherStats);
      assert.equal(otherStats.owner.glowBalance, 999);
      assert.equal(otherStats.totals.inventory.purchases, 0);
      assert.equal(otherStats.totals.journey.notes, 0);
      assert.equal(otherStats.totals.activeDays, 1);
      assert.equal(
        stats.totals.availableBadges,
        otherStats.totals.availableBadges + 1,
      );
      const selectedYear = await playerStatsRepository.getForPlayer(
        ownerId,
        2025,
        now,
      );
      assert.ok(selectedYear);
      assert.equal(selectedYear.totals.days.length, 1);
      assert.equal(
        selectedYear.totals.journey.completedWaypoints,
        6,
        "Period changes never relabel lifetime totals.",
      );
      const emptyYear = await playerStatsRepository.getForPlayer(
        ownerId,
        2024,
        now,
      );
      assert.equal(emptyYear?.totals.days.length, 0);
      assert.equal(
        await playerStatsRepository.getForPlayer(randomUUID(), "recent", now),
        null,
      );
      assert.equal(
        JSON.stringify(stats).includes("This private content"),
        false,
      );
      assert.equal("userId" in stats.owner, false);
      assert.equal("email" in stats.owner, false);
      assert.equal(
        await prisma.gameModeAttempt.count({ where: { userId: ownerId } }),
        6,
        "Reading statistics never changes attempts.",
      );
      assert.equal(
        await prisma.rewardLedger.count({ where: { userId: ownerId } }),
        4,
        "Reading statistics never writes rewards.",
      );
      await prisma.user.update({
        where: { id: ownerId },
        data: { banned: true },
      });
      assert.equal(
        await playerStatsRepository.getForPlayer(ownerId, "recent", now),
        null,
      );
    } finally {
      if (started) {
        await prisma.userAvatarOwnership.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.userShopPurchase.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.rewardLedger.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.gameSession.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
        await prisma.beaconWeek.deleteMany({ where: { id: { in: weekIds } } });
        await prisma.waypoint.deleteMany({
          where: { id: { in: waypointIds } },
        });
        await prisma.verse.deleteMany({ where: { id: { in: verseIds } } });
        await prisma.badge.deleteMany({ where: { id: { in: badgeIds } } });
        await prisma.shopItem.deleteMany({ where: { id: { in: itemIds } } });
      }
      await prisma.$disconnect();
    }
  },
);
