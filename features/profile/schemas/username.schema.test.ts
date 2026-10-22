/** Pure handle/input tests protect canonical uniqueness before database access. */
import assert from "node:assert/strict";
import test from "node:test";
import { updateUsernameSchema, usernameSchema } from "./username.schema";

test("handles normalize case, surrounding whitespace and a leading at sign", () => {
  assert.equal(usernameSchema.parse("  @Amara_Grace  "), "amara_grace");
  assert.equal(usernameSchema.parse("AMARA_GRACE"), "amara_grace");
  for (const invalid of ["ab", "a".repeat(25), "amara grace", "a-b", "éclair", "@@amara", "a/b", ""]) {
    assert.equal(usernameSchema.safeParse(invalid).success, false, invalid);
  }
});

test("a handle change cannot inject another account or unexpected fields", () => {
  assert.equal(updateUsernameSchema.safeParse({ username: "amara", userId: "someone-else" }).success, false);
});
