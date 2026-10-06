/** Checks destructive governance inputs without accessing credentials or a database. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  emergencyFellowshipActionSchema,
  requestLeadershipTransferSchema,
  respondLeadershipTransferSchema,
  scheduleFellowshipDissolutionSchema,
} from "./fellowship-governance.schema";

const fellowshipId = "cm12345678901234567890123";
const memberId = "cm98765432109876543210987";
const password = "correct horse battery staple";

test("leadership offers require a real target membership and password", () => {
  assert.equal(
    requestLeadershipTransferSchema.safeParse({
      fellowshipId,
      targetMemberId: memberId,
      password,
    }).success,
    true,
  );
  assert.equal(
    requestLeadershipTransferSchema.safeParse({
      fellowshipId,
      targetMemberId: "not-a-membership-id",
      password,
    }).success,
    false,
  );
});

test("transfer responses accept only accept or decline", () => {
  assert.equal(
    respondLeadershipTransferSchema.safeParse({
      transferId: memberId,
      response: "ACCEPT",
    }).success,
    true,
  );
  assert.equal(
    respondLeadershipTransferSchema.safeParse({
      transferId: memberId,
      response: "CANCEL",
    }).success,
    false,
  );
});

test("leader closure requires password confirmation and a typed name", () => {
  const valid = { fellowshipId, password, confirmationName: "Faith Circle" };
  assert.equal(scheduleFellowshipDissolutionSchema.safeParse(valid).success, true);
  assert.equal(
    scheduleFellowshipDissolutionSchema.safeParse({ ...valid, password: "" }).success,
    false,
  );
  assert.equal(
    scheduleFellowshipDissolutionSchema.safeParse({ ...valid, confirmationName: "" }).success,
    false,
  );
});

test("emergency actions require a reason and reauthentication", () => {
  const valid = {
    fellowshipId,
    password,
    confirmationName: "Faith Circle",
    reason: "The current leader account is no longer accessible.",
  };
  assert.equal(emergencyFellowshipActionSchema.safeParse(valid).success, true);
  assert.equal(
    emergencyFellowshipActionSchema.safeParse({ ...valid, reason: "Urgent" }).success,
    false,
  );
});
