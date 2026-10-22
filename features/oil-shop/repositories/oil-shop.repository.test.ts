/** Real local PostgreSQL tests for currency atomicity and permanent cosmetic access.
 * Refuses development/hosted DBs, requires empty user fixtures, and cleans only
 * this run's users in FK order. Seeded products and all unrelated data stay intact.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { requireSafeTestDatabaseUrl } from "@/lib/testing/test-database-guard";

const applicationDatabaseUrl = process.env.DATABASE_URL;

test("shop purchases serialize, grant avatars once and enforce Settings ownership", {
  skip: process.env.TEST_DATABASE_URL ? false : "Local test URL required.",
}, async () => {
  process.env.DATABASE_URL = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
  });
  const { prisma } = await import("@/lib/prisma");
  const { oilShopRepository, OilShopConflictError } = await import("./oil-shop.repository");
  const { settingsRepository } = await import("@/features/settings/repositories/settings.repository");
  const ids = [randomUUID(), randomUUID()];
  let started = false;
  try {
    assert.equal(await prisma.user.count(), 0, "Fixture users must be empty.");
    started = true;
    for (const id of ids) {
      await prisma.user.create({ data: {
        id, name: "Shop test", email: `${id}@example.test`,
        profile: { create: { displayName: "Shop test", totalGlowPoints: 500, avatarKey: "lion" } },
      } });
    }
    const before = await oilShopRepository.getShopData(ids[0]);
    assert.deepEqual(before.items.map((item) => [item.hintQuantity, item.cost]), [[3,120],[10,300],[25,600],[50,1000]]);
    assert.equal(before.avatars.length, 9);
    const fox = before.avatars.find((avatar) => avatar.avatarKey === "fox")!;
    await assert.rejects(oilShopRepository.equipAvatar(ids[0], "fox"), OilShopConflictError);
    await assert.rejects(settingsRepository.updateForUser(ids[0], { avatarKey: "fox" }));
    // Distinct request keys race for the same cosmetic; ownership permits one debit only.
    const results = await Promise.all(Array.from({ length: 4 }, () =>
      oilShopRepository.purchaseItem(ids[0], fox.id, randomUUID())));
    assert.ok(results.every((result) => result.balance === 250 && result.avatarKey === "fox"));
    assert.ok(results.every((result) => result.ownedAvatarKeys?.includes("fox")));
    assert.equal(await prisma.userAvatarOwnership.count({ where: { userId: ids[0] } }), 1);
    assert.equal(await prisma.userShopPurchase.count({ where: { userId: ids[0] } }), 1);
    assert.equal(await prisma.rewardLedger.count({ where: { userId: ids[0] } }), 1);
    const ledger = await prisma.rewardLedger.findFirstOrThrow({ where: { userId: ids[0] } });
    assert.equal(ledger.amount, -250);
    assert.equal((await oilShopRepository.getShopData(ids[0])).purchasedHints, 0);
    assert.deepEqual((await oilShopRepository.getShopData(ids[0])).ownedAvatarKeys, ["fox"]);
    // A retired listing remains in the learner's usable collection and can equip.
    await prisma.shopItem.update({ where: { id: fox.id }, data: { isActive: false } });
    try {
      const retired = await oilShopRepository.getShopData(ids[0]);
      assert.ok(!retired.avatars.some((avatar) => avatar.avatarKey === "fox"));
      assert.ok(retired.ownedAvatarKeys.includes("fox"));
      await oilShopRepository.equipAvatar(ids[0], "fox");
    } finally {
      await prisma.shopItem.update({ where: { id: fox.id }, data: { isActive: true } });
    }
    await oilShopRepository.equipAvatar(ids[0], "fox");
    await settingsRepository.updateForUser(ids[0], { avatarKey: "fox" });
    assert.equal((await oilShopRepository.getShopData(ids[0])).equippedAvatarKey, "fox");
    await assert.rejects(oilShopRepository.equipAvatar(ids[1], "fox"), OilShopConflictError);
    await settingsRepository.updateForUser(ids[0], { avatarKey: "dove" });
    assert.equal((await oilShopRepository.getShopData(ids[0])).equippedAvatarKey, "dove");

    const key = randomUUID();
    const pack = before.items[0];
    const hints = await Promise.all(Array.from({ length: 3 }, () =>
      oilShopRepository.purchaseItem(ids[0], pack.id, key)));
    assert.ok(hints.every((result) => result.balance === 130 && result.purchasedHints === 3));
    assert.ok(hints.every((result) => result.hintQuantity === 3));
    assert.equal(await prisma.rewardLedger.count({ where: { userId: ids[0] } }), 2);
    await assert.rejects(oilShopRepository.purchaseItem(ids[1], pack.id, key), OilShopConflictError);
    // Four different hint purchases compete for 500; at most four 120-point packs succeed.
    const races = await Promise.allSettled(Array.from({ length: 5 }, () =>
      oilShopRepository.purchaseItem(ids[1], pack.id, randomUUID())));
    assert.equal(races.filter((result) => result.status === "fulfilled").length, 4);
    assert.equal((await oilShopRepository.getShopData(ids[1])).balance, 20);
    const final = await oilShopRepository.getShopData(ids[0]);
    await assert.rejects(oilShopRepository.purchaseItem(ids[0], before.items[3].id, randomUUID()), OilShopConflictError);
    assert.equal((await oilShopRepository.getShopData(ids[0])).balance, final.balance);
    // Retired offers are unavailable, but immutable snapshots still count toward hints.
    await prisma.shopItem.update({ where: { id: pack.id }, data: { isActive: false } });
    try {
      await assert.rejects(oilShopRepository.purchaseItem(ids[0], pack.id, randomUUID()), OilShopConflictError);
      assert.equal((await oilShopRepository.getShopData(ids[0])).purchasedHints, 3);
      // Replaying an acknowledged request remains safe even after retirement.
      assert.equal((await oilShopRepository.purchaseItem(ids[0], pack.id, key)).balance, 130);
    } finally {
      await prisma.shopItem.update({ where: { id: pack.id }, data: { isActive: true } });
    }
  } finally {
    if (started) {
      await prisma.userAvatarOwnership.deleteMany({ where: { userId: { in: ids } } });
      await prisma.userShopPurchase.deleteMany({ where: { userId: { in: ids } } });
      await prisma.rewardLedger.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  }
});

test("rollout resets paid portraits and retires offers without erasing purchase snapshots", {
  skip: process.env.TEST_DATABASE_URL ? false : "Local test URL required.",
}, async () => {
  const connectionString = requireSafeTestDatabaseUrl({
    applicationDatabaseUrl,
    testDatabaseUrl: process.env.TEST_DATABASE_URL,
    confirmation: process.env.TEST_DATABASE_CONFIRMATION,
  });
  const client = new Client({ connectionString });
  // The generated identifier contains only a fixed prefix and hexadecimal chars.
  // Its schema is separate from real tables; cleanup never touches public data.
  const schema = `shop_upgrade_${randomUUID().replaceAll("-", "")}`;
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`
      CREATE TABLE "user" ("id" TEXT PRIMARY KEY);
      CREATE TABLE "UserProfile" ("avatarKey" TEXT, "updatedAt" TIMESTAMP(3));
      CREATE TABLE "ShopItem" (
        "id" TEXT PRIMARY KEY, "slug" TEXT UNIQUE, "name" TEXT,
        "description" TEXT, "itemType" TEXT, "grantQuantity" INTEGER,
        "cost" INTEGER, "isActive" BOOLEAN, "updatedAt" TIMESTAMP(3)
      );
      CREATE TABLE "UserShopPurchase" (
        "id" TEXT PRIMARY KEY, "entitlementQuantity" INTEGER
      );
      INSERT INTO "UserProfile" VALUES ('fox', now()), ('dove', now());
      INSERT INTO "ShopItem" VALUES ('old', 'old-pack', 'Old pack', '', 'HINT_PACK', 3, 125, true, now());
      INSERT INTO "UserShopPurchase" VALUES ('history', 3);
    `);
    const sql = await readFile("prisma/migrations/20261018150000_shop_avatar_inventory/migration.sql", "utf8");
    await client.query(sql);
    const avatars = await client.query<{ avatarKey: string }>('SELECT "avatarKey" FROM "UserProfile" ORDER BY "avatarKey"');
    assert.deepEqual(avatars.rows.map((row) => row.avatarKey), ["dove", "lion"]);
    const historical = await client.query<{ entitlementQuantity: number }>('SELECT "entitlementQuantity" FROM "UserShopPurchase"');
    assert.equal(historical.rows[0].entitlementQuantity, 3);
    const offers = await client.query<{ count: string }>('SELECT count(*) FROM "ShopItem" WHERE "isActive" = true');
    assert.equal(Number(offers.rows[0].count), 13);
    const ownership = await client.query<{ count: string }>('SELECT count(*) FROM "UserAvatarOwnership"');
    assert.equal(Number(ownership.rows[0].count), 0, "Old selections must not grant free ownership.");
  } finally {
    // A failed SQL transaction must be released before removing this unique schema.
    await client.query("ROLLBACK");
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
});
