import assert from "node:assert/strict";
import test from "node:test";
import {
  isSingleModeAdminTest,
  shouldAwardVaultReplayBadge,
} from "@/features/gameplay/lib/gameplay-session-policy";

test("an administrator Vault fixture remains a full ordered replay", () => {
  const fixture = { isAdminTest: true, isVaultReplay: true };

  assert.equal(isSingleModeAdminTest(fixture), false);
  assert.equal(shouldAwardVaultReplayBadge(fixture), false);
});

test("ordinary Vault replay can award its replay badge", () => {
  const replay = { isAdminTest: false, isVaultReplay: true };

  assert.equal(isSingleModeAdminTest(replay), false);
  assert.equal(shouldAwardVaultReplayBadge(replay), true);
});
