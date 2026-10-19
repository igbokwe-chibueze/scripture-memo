/** Public navigation references must never accept private Better Auth or profile CUIDs. */
import assert from "node:assert/strict";
import test from "node:test";
import { publicProfileSchema } from "./public-profile.schema";

test("profile placeholder accepts public UUIDs and rejects private/malformed references", () => {
  assert.equal(publicProfileSchema.safeParse({ publicId: "b0e2dd60-1c6a-48e9-bfab-615934f53851" }).success, true);
  for (const publicId of ["cm12345678901234567890123", "user-123", "../settings", ""]) {
    assert.equal(publicProfileSchema.safeParse({ publicId }).success, false);
  }
});
