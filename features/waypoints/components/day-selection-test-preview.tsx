"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DaySelection } from "@/features/waypoints/components/day-selection";
import type { StartDay } from "@/features/waypoints/components/day-card";
import type {
  DayCardData,
  DaySelectionData,
} from "@/features/waypoints/types/day-selection.types";
import {
  DayLevel,
  JourneyStage,
  TranslationCode,
} from "@/lib/generated/prisma/enums";

const sampleData: DaySelectionData = {
  waypointId: "sample-waypoint",
  verseId: "sample-verse",
  waypointNumber: 12,
  reference: "Psalm 119:105",
  journeyStage: JourneyStage.RECALL,
  translation: TranslationCode.KJV,
  translationText:
    "Thy word is a lamp unto my feet, and a light unto my path.",
  studyAccess: "PRE_STUDY",
  dayProgress: [],
};

const sampleCards: DayCardData[] = [
  {
    dayLevel: DayLevel.GLIMMER,
    name: "Glimmer",
    difficulty: "Gentle beginning",
    status: "COMPLETE",
    reward: 100,
    unlocksAt: null,
    blockedReason: null,
    completedSessionId: "sample-completed-session",
  },
  {
    dayLevel: DayLevel.GLOW,
    name: "Glow",
    difficulty: "Growing recall",
    status: "READY",
    reward: 150,
    unlocksAt: null,
    blockedReason: null,
    completedSessionId: null,
  },
  {
    dayLevel: DayLevel.RADIANCE,
    name: "Radiance",
    difficulty: "Full remembrance",
    status: "LOCKED",
    reward: 200,
    unlocksAt: null,
    blockedReason: "Complete Glow first.",
    completedSessionId: null,
  },
];

/**
 * Exercises Day Selection with disposable responses and representative states.
 * No account, database row, gameplay attempt, reward, or cooldown is changed.
 */
function PreviewRun({ rejectOnce }: { rejectOnce: boolean }): React.ReactNode {
  const attempts = useRef(0);

  const startDay: StartDay = async () => {
    const reject = rejectOnce && attempts.current++ === 0;
    await new Promise<void>((resolve) => setTimeout(resolve, 1_200));

    if (reject) {
      return {
        success: false,
        message: "Sample start rejected. Retry to confirm recovery.",
      };
    }

    return {
      success: true,
      message: "Sample challenge prepared. No gameplay attempt was created.",
    };
  };

  return (
    <DaySelection
      data={sampleData}
      cards={sampleCards}
      isAdmin={false}
      startDayAction={startDay}
    />
  );
}

/** Prepared mobile acceptance check for the production Day Selection composition. */
export function DaySelectionTestPreview(): React.ReactNode {
  const [rejectOnce, setRejectOnce] = useState(false);
  const [run, setRun] = useState(0);

  return (
    <section id="day-selection-testing" className="space-y-5">
      <h2 className="font-heading text-2xl font-black">Day Selection testing</h2>
      <p className="text-sm text-muted-foreground">
        At 375px, verify the verse header, stage rule, and all three day cards
        fit without horizontal overflow. Start Glow to check pending feedback.
        The rejection scenario should preserve the screen and succeed on retry.
        Tap Radiance to confirm its blocked explanation. Only sample state changes.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {([false, true] as const).map((reject) => (
          <Button
            key={String(reject)}
            variant={rejectOnce === reject ? "default" : "outline"}
            aria-pressed={rejectOnce === reject}
            onClick={() => {
              setRejectOnce(reject);
              setRun((current) => current + 1);
            }}
          >
            {reject ? "Reject once, then retry" : "Success"}
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() => setRun((current) => current + 1)}
        >
          Reset scenario
        </Button>
      </div>

      <PreviewRun key={run} rejectOnce={rejectOnce} />
    </section>
  );
}
