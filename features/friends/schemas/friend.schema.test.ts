/** Social input limits reject forged identities and unbounded directory reads. */
import assert from "node:assert/strict";
import test from "node:test";
import { friendMutationSchema, friendsPageSchema } from "./friend.schema";

test("mutations accept public UUIDs and only supported operations", () => {
  const input = { publicId: "e58d7ecd-d70b-40dd-aadf-d73d35a4cf03", operation: "accept" };
  assert.equal(friendMutationSchema.safeParse(input).success, true);
  assert.equal(friendMutationSchema.safeParse({ ...input, userId: "forged" }).success, false);
  assert.equal(friendMutationSchema.safeParse({ ...input, operation: "autoaccept" }).success, false);
  assert.equal(friendMutationSchema.safeParse({ ...input, publicId: "private-auth-id" }).success, false);
});

test("list filters fall back safely and bound page/search sizes", () => {
  assert.deepEqual(friendsPageSchema.parse({}), { tab: "friends", q: "", page: 1 });
  assert.equal(friendsPageSchema.parse({ page: -1 }).page, 1);
  assert.equal(friendsPageSchema.parse({ page: 100000 }).page, 1);
  assert.equal(friendsPageSchema.parse({ q: "x".repeat(51) }).q, "");
});
