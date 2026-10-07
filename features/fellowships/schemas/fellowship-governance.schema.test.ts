/** Checks destructive governance inputs without accessing credentials or a database. */
import assert from "node:assert/strict";
import test from "node:test";
import {
  emergencyFellowshipActionSchema,
  fellowshipModerationSearchSchema,
  requestLeadershipTransferSchema,
  resolveFellowshipSuspensionAppealSchema,
  respondLeadershipTransferSchema,
  scheduleFellowshipDissolutionSchema,
  submitFellowshipSuspensionAppealSchema,
  suspendFellowshipSchema,
} from "./fellowship-governance.schema";

const fellowshipId = "cm12345678901234567890123";
const memberId = "cm98765432109876543210987";
const password = "correct horse battery staple";

test("Fellowship moderation search validates status filters and bounded pages", () => {
  assert.deepEqual(
    fellowshipModerationSearchSchema.parse({
      query: "  Grace Circle  ",
      status: "APPEAL_PENDING",
      page: "3",
    }),
    { query: "Grace Circle", status: "APPEAL_PENDING", page: 3 },
  );
  assert.equal(
    fellowshipModerationSearchSchema.safeParse({ status: "UNSUPPORTED" }).success,
    false,
  );
  assert.equal(
    fellowshipModerationSearchSchema.safeParse({ page: "0" }).success,
    false,
  );
});

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

test("suspension requires exact-name confirmation, password, and a reason", () => {
  const valid = {
    fellowshipId,
    password,
    confirmationName: "Faith Circle",
    reason: "The community needs a documented safety review.",
  };
  assert.equal(suspendFellowshipSchema.safeParse(valid).success, true);
  assert.equal(suspendFellowshipSchema.safeParse({ ...valid, reason: "Urgent" }).success, false);
  assert.equal(suspendFellowshipSchema.safeParse({ ...valid, confirmationName: "" }).success, false);
});

test("suspension appeals require one substantial statement", () => {
  assert.equal(
    submitFellowshipSuspensionAppealSchema.safeParse({
      suspensionId: memberId,
      statement: "Please review the suspension and consider the new information.",
    }).success,
    true,
  );
  assert.equal(
    submitFellowshipSuspensionAppealSchema.safeParse({
      suspensionId: memberId,
      statement: "Too short",
    }).success,
    false,
  );
});

test("appeal decisions require a password, supported outcome, and recorded reason", () => {
  const valid = {
    suspensionId: memberId,
    password,
    decision: "UPHOLD",
    decisionReason: "The reviewed evidence supports the original suspension.",
  };
  assert.equal(resolveFellowshipSuspensionAppealSchema.safeParse(valid).success, true);
  assert.equal(
    resolveFellowshipSuspensionAppealSchema.safeParse({ ...valid, decision: "DEFER" }).success,
    false,
  );
  assert.equal(
    resolveFellowshipSuspensionAppealSchema.safeParse({ ...valid, decisionReason: "No" }).success,
    false,
  );
});
