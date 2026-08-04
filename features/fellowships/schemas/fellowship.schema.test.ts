/** Validates the public Fellowship input boundary without touching a database. */
import assert from "node:assert/strict";
import test from "node:test";
import { createFellowshipSchema, joinByInviteSchema, regenerateFellowshipInviteSchema } from "./fellowship.schema";

test("fellowship creation accepts constrained multilingual names", () => {
  assert.equal(createFellowshipSchema.safeParse({ name: "Grâce & Vérité", description: "Un cercle accueillant.", isPublic: true, insigniaKey: "good-shepherd" }).success, true);
});

test("fellowship identity rejects arbitrary insignia paths", () => {
  assert.equal(createFellowshipSchema.safeParse({ name: "Faith Circle", description: "", isPublic: true, insigniaKey: "https://example.com/upload.png" }).success, false);
});

test("fellowship creation rejects markup and oversized descriptions", () => {
  assert.equal(createFellowshipSchema.safeParse({ name: "<script>alert(1)</script>", description: "", isPublic: true }).success, false);
  assert.equal(createFellowshipSchema.safeParse({ name: "Faith Circle", description: "x".repeat(281), isPublic: true }).success, false);
});

test("private invite codes require a constrained non-empty value", () => {
  assert.equal(joinByInviteSchema.safeParse({ inviteCode: "short" }).success, false);
  assert.equal(joinByInviteSchema.safeParse({ inviteCode: "valid-code-123" }).success, true);
});

test("invite rotation accepts only a valid Fellowship identifier", () => {
  assert.equal(regenerateFellowshipInviteSchema.safeParse({ fellowshipId: "cm12345678901234567890123" }).success, true);
  assert.equal(regenerateFellowshipInviteSchema.safeParse({ fellowshipId: "not-an-id" }).success, false);
});
