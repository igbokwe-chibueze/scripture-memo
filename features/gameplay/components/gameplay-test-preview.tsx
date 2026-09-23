"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GameShell } from "@/features/gameplay/components/game-shell";
import type {
  GameModeAttemptData,
  GameplaySessionData,
} from "@/features/gameplay/types/game-session.types";
import {
  CompletionStatus,
  DayLevel,
  GameMode,
  GameModeAttemptStatus,
  JourneyStage,
  TranslationCode,
} from "@/lib/generated/prisma/enums";
import type { ActionResult } from "@/types/api";

const sampleSession: GameplaySessionData = {
  id: "sample-gameplay-session",
  waypointId: "sample-waypoint",
  dayLevel: DayLevel.GLIMMER,
  status: CompletionStatus.IN_PROGRESS,
  isVaultReplay: false,
  isAdminTest: false,
  adminTestMode: null,
  translation: TranslationCode.KJV,
  waypoint: {
    number: 12,
    journeyStage: JourneyStage.LEARN,
  },
  verse: {
    id: "sample-verse",
    reference: "Psalm 119:105",
    translationText:
      "Thy word is a lamp unto my feet, and a light unto my path.",
  },
  completedModes: [],
  currentMode: GameMode.DRAG_DROP,
  audioEnabled: true,
  hintBalance: 3,
  beaconProgress: {
    lifetimeXp: 145,
    level: 2,
    currentLevelStartXp: 100,
    nextLevelXp: 250,
  },
};

type Scenario = "success" | "rejected";

/** Remounting restores the entry screen and resets the reject-once attempt. */
function PreviewRun({ scenario }: { scenario: Scenario }): React.ReactNode {
  const attempts = useRef(0);

  async function startMode(): Promise<ActionResult<GameModeAttemptData>> {
    const reject = scenario === "rejected" && attempts.current++ === 0;
    await new Promise<void>((resolve) => setTimeout(resolve, 1_200));

    if (reject) {
      return {
        success: false,
        message: "Sample mode start rejected. Retry to confirm recovery.",
      };
    }

    return {
      success: true,
      message: "Sample Drag & Drop mode started. No real attempt was created.",
      data: {
        id: "sample-attempt",
        gameMode: GameMode.DRAG_DROP,
        attemptNumber: 1,
        status: GameModeAttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
        expiresAt: null,
      },
    };
  }

  return (
    <GameShell
      gameSession={sampleSession}
      isAdmin={false}
      startModeAction={startMode}
      useSampleHint
    />
  );
}

/** Isolated acceptance surface for the production gameplay frame and first mode. */
export function GameplayTestPreview(): React.ReactNode {
  const [scenario, setScenario] = useState<Scenario>("success");
  const [run, setRun] = useState(0);

  return (
    <section id="gameplay-testing" className="space-y-5">
      <h2 className="font-heading text-2xl font-black">Gameplay screen testing</h2>
      <p className="text-sm text-muted-foreground">
        At 375px, inspect the header, progress, Beacon bar, mode card, menu, and
        hint control. Begin Drag &amp; Drop to check pending feedback and the first
        mode layout. The rejection scenario should remain usable and succeed on
        retry. The hint is local sample content; do not submit the sample answer.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {(["success", "rejected"] as const).map((value) => (
          <Button
            key={value}
            variant={scenario === value ? "default" : "outline"}
            aria-pressed={scenario === value}
            onClick={() => {
              setScenario(value);
              setRun((current) => current + 1);
            }}
          >
            {value === "success" ? "Success" : "Reject once, then retry"}
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() => setRun((current) => current + 1)}
        >
          Reset scenario
        </Button>
      </div>

      <PreviewRun key={run} scenario={scenario} />
    </section>
  );
}
