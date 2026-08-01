import assert from "node:assert/strict";
import test from "node:test";
import { getStudyAccessState } from "@/features/sanctuary/lib/study-access";

test("an unlocked waypoint opens the pre-study window", () => {
  assert.equal(getStudyAccessState([{ number: 1, status: "UNLOCKED" }]), "PRE_STUDY");
});

test("active practice and cooldown both lock study content", () => {
  assert.equal(getStudyAccessState([{ number: 1, status: "IN_PROGRESS" }]), "LOCKED");
  assert.equal(getStudyAccessState([{ number: 1, status: "COOLDOWN" }]), "LOCKED");
});

test("Radiance completion permanently reopens study", () => {
  assert.equal(getStudyAccessState([{ number: 1, status: "COMPLETED" }]), "PERMANENT");
});

test("a later active stage overrides an older completed occurrence", () => {
  assert.equal(
    getStudyAccessState([
      { number: 1, status: "COMPLETED" },
      { number: 8, status: "IN_PROGRESS" },
    ]),
    "LOCKED",
  );
});

test("a locked future occurrence does not revoke completed access", () => {
  assert.equal(
    getStudyAccessState([
      { number: 1, status: "COMPLETED" },
      { number: 8, status: "LOCKED" },
    ]),
    "PERMANENT",
  );
});
