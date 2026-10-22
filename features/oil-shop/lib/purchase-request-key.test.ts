/** Regression coverage for HTTP browsers lacking randomUUID; no database writes. */
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { test } from "node:test";
import { createPurchaseRequestKey } from "./purchase-request-key";
import { purchaseShopItemSchema } from "../schemas/purchase-shop-item.schema";

test("fallback keys satisfy purchase validation and distinguish purchases", () => {
  // Deliberately omit randomUUID to reproduce the reported browser capability.
  const source = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };
  const keys = Array.from({ length: 100 }, () => createPurchaseRequestKey(source));

  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) {
    assert.match(key, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(purchaseShopItemSchema.safeParse({
      itemId: "shop-hints-small-v2",
      idempotencyKey: key,
    }).success, true);
  }
});

test("uses native randomUUID when available", () => {
  const expected = "ea756083-553e-460c-a8da-1709a9d20360";
  assert.equal(createPurchaseRequestKey({
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
    randomUUID: () => expected,
  }), expected);
});
