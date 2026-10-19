/** Validates the public Fellowship input boundary without touching a database. */
import assert from "node:assert/strict";
import test from "node:test";
import { cancelJoinRequestSchema, createFellowshipSchema, joinByInviteSchema, regenerateFellowshipInviteSchema, resolveJoinRequestSchema, updateFellowshipSchema } from "./fellowship.schema";
import { splitFellowshipGuidelines } from "../lib/fellowship-content";

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

test("join-request decisions accept only explicit leader outcomes", () => {
  const requestId = "cm12345678901234567890123";
  assert.equal(resolveJoinRequestSchema.safeParse({ requestId, decision: "APPROVE" }).success, true);
  assert.equal(resolveJoinRequestSchema.safeParse({ requestId, decision: "DELETE" }).success, false);
  assert.equal(cancelJoinRequestSchema.safeParse({ requestId }).success, true);
});

/** New overview copy is bounded before authorization or database access. */
test("overview validation bounds introduction and individual guideline lines", () => {
  const input = {
    fellowshipId: "cm12345678901234567890123",
    name: "Faith Circle",
    introduction: "  Practice Scripture together.  ",
    description: "A welcoming fellowship.",
    guidelines: " Make time for practice.\r\n\r\n Be kind. ",
    isPublic: true,
    insigniaKey: "word-star",
  };
  const parsed = updateFellowshipSchema.parse(input);
  assert.equal(parsed.introduction, "Practice Scripture together.");
  assert.deepEqual(splitFellowshipGuidelines(parsed.guidelines), [
    "Make time for practice.",
    "Be kind.",
  ]);
  assert.equal(updateFellowshipSchema.safeParse({ ...input, introduction: "x".repeat(141) }).success, false);
  assert.equal(updateFellowshipSchema.safeParse({ ...input, guidelines: "x".repeat(161) }).success, false);
  assert.equal(updateFellowshipSchema.safeParse({ ...input, guidelines: Array(9).fill("Be kind.").join("\n") }).success, false);
  assert.equal(updateFellowshipSchema.safeParse({ ...input, guidelines: " " }).success, true);
});
