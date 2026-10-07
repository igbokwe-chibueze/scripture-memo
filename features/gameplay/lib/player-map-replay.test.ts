import assert from "node:assert/strict";
import test from "node:test";
import {
  CompletionStatus,
  DayLevel,
  GameMode,
  JourneyStage,
  TranslationCode,
} from "@/lib/generated/prisma/enums";
import type { GameplaySessionData } from "@/features/gameplay/types/game-session.types";
import { resolvePlayerMapReplayMode } from "@/features/gameplay/lib/player-map-replay";

const completedSession: GameplaySessionData = {
  id: "completed-session",
  waypointId: "waypoint-1",
  dayLevel: DayLevel.GLIMMER,
  status: CompletionStatus.COMPLETED,
  isVaultReplay: false,
  isAdminTest: false,
  adminTestMode: null,
  translation: TranslationCode.KJV,
  waypoint: { number: 1, journeyStage: JourneyStage.LEARN },
  verse: {
    id: "verse-1",
    reference: "Psalm 119:105",
    translationText: "Thy word is a lamp unto my feet.",
  },
  completedModes: [GameMode.DRAG_DROP, GameMode.PUZZLE],
  currentMode: null,
  audioEnabled: true,
  hintBalance: 0,
  beaconProgress: {
    lifetimeXp: 0,
    level: 1,
    currentLevelStartXp: 0,
    nextLevelXp: 100,
  },
};

test("allows practice only for a mode completed in an owned completed campaign day", () => {
  assert.deepEqual(
    resolvePlayerMapReplayMode("PUZZLE", completedSession),
    { kind: "PRACTICE", mode: GameMode.PUZZLE },
  );
});

test("does not allow an incomplete mode or a malformed repeated query value", () => {
  assert.deepEqual(
    resolvePlayerMapReplayMode("SWAP", completedSession),
    { kind: "INVALID" },
  );
  assert.deepEqual(
    resolvePlayerMapReplayMode(["PUZZLE", "SWAP"], completedSession),
    { kind: "INVALID" },
  );
});

test("requires a completed non-test campaign session with waypoint and day context", () => {
  const invalidSessions: GameplaySessionData[] = [
    { ...completedSession, status: CompletionStatus.IN_PROGRESS },
    { ...completedSession, isAdminTest: true },
    { ...completedSession, isVaultReplay: true },
    { ...completedSession, waypointId: null },
    { ...completedSession, dayLevel: null },
  ];

  for (const session of invalidSessions) {
    assert.deepEqual(
      resolvePlayerMapReplayMode("DRAG_DROP", session),
      { kind: "INVALID" },
    );
  }
});

test("distinguishes a normal session request from an invalid replay request", () => {
  assert.deepEqual(resolvePlayerMapReplayMode(undefined, completedSession), {
    kind: "NONE",
  });
  assert.deepEqual(resolvePlayerMapReplayMode("FILL", null), {
    kind: "INVALID",
  });
});
