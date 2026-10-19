/** Owner-approved economy and Settings access cannot drift independently. */
import assert from "node:assert/strict";
import test from "node:test";
import { HINT_SHOP_CATALOG } from "./hint-shop-catalog";
import { AVATAR_SHOP_CATALOG, avatarKeyForSlug } from "./avatar-shop-catalog";
import { FREE_AVATAR_KEYS } from "@/features/profile/data/avatar-catalog";
import { equipShopAvatarSchema } from "../schemas/equip-shop-avatar.schema";
import { purchaseShopItemSchema } from "../schemas/purchase-shop-item.schema";

test("four replacement packs match approved quantities and prices", () => {
  assert.deepEqual(HINT_SHOP_CATALOG.map((pack) => [pack.grantQuantity, pack.cost]), [
    [3, 120], [10, 300], [25, 600], [50, 1000],
  ]);
});

test("only three avatars are free and nine distinct paid avatars cost 250", () => {
  assert.deepEqual(FREE_AVATAR_KEYS, ["lion", "dove", "deer"]);
  assert.equal(AVATAR_SHOP_CATALOG.length, 9);
  assert.equal(new Set(AVATAR_SHOP_CATALOG.map((avatar) => avatar.slug)).size, 9);
  for (const avatar of AVATAR_SHOP_CATALOG) {
    assert.equal(avatar.cost, 250);
    assert.ok(!FREE_AVATAR_KEYS.includes(avatar.avatarKey));
    assert.equal(avatarKeyForSlug(avatar.slug), avatar.avatarKey);
  }
  assert.equal(avatarKeyForSlug("avatar-lion"), undefined);
});

test("purchase/equip schemas reject injected identity, prices and invalid keys", () => {
  assert.ok(purchaseShopItemSchema.safeParse({ itemId: "shop-avatar-fox", idempotencyKey: "224edc48-cdf7-4b83-a11a-64ef5609cd91" }).success);
  assert.ok(!purchaseShopItemSchema.safeParse({ itemId: "shop-avatar-fox", idempotencyKey: "bad", cost: 0 }).success);
  assert.ok(!equipShopAvatarSchema.safeParse({ avatarKey: "fox", userId: "someone-else" }).success);
  assert.ok(!equipShopAvatarSchema.safeParse({ avatarKey: "not-real" }).success);
});
