import assert from "node:assert/strict";
import test from "node:test";
import { JourneyStage } from "@/lib/generated/prisma/enums";
import {
  VAULT_REPLAY_DAY_LEVEL,
  VAULT_REPLAY_HINTS_ALLOWED,
  VAULT_REPLAY_IS_TIMED,
} from "@/features/vault/constants/vault-replay-rules";
import { hasCompletedEveryJourneyStage } from "@/features/vault/lib/vault-mastery";

test("mastery requires all four distinct Journey Stages", () => {
  assert.equal(
    hasCompletedEveryJourneyStage(
      new Set([
        JourneyStage.LEARN,
        JourneyStage.RECALL,
        JourneyStage.STRENGTHEN,
      ]),
    ),
    false,
  );
  assert.equal(
    hasCompletedEveryJourneyStage(new Set(Object.values(JourneyStage))),
    true,
  );
});

test("Vault replay uses the approved isolated Radiance policy", () => {
  assert.equal(VAULT_REPLAY_DAY_LEVEL, "RADIANCE");
  assert.equal(VAULT_REPLAY_IS_TIMED, false);
  assert.equal(VAULT_REPLAY_HINTS_ALLOWED, false);
});
