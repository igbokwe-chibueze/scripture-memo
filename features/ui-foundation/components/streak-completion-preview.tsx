"use client";

import { useState } from "react";
import { FlameIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StreakCompletionScreen } from "@/features/gameplay/components/streak-completion-screen";

type StreakPreviewVariant = "daily" | "level" | "reset" | null;

/** Builds deterministic forward-looking preview dates without product writes. */
function createPreviewForecast(
  currentStreak: number,
  milestoneOffset: number,
): Array<{
  dateKey: string;
  label: string;
  streakDays: number;
  state: "today" | "upcoming" | "milestone";
}> {
  const offsets =
    milestoneOffset > 6
      ? [0, 1, 2, 3, 4, 5, milestoneOffset]
      : [0, 1, 2, 3, 4, 5, 6];
  return offsets.map((offset) => {
    const date = new Date(Date.UTC(2026, 6, 28 + offset));
    return {
      dateKey: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }).format(date),
      streakDays: currentStreak + offset,
      state:
        offset === 0
          ? "today"
          : offset === milestoneOffset
            ? "milestone"
            : "upcoming",
    };
  });
}

/** Replays the dedicated production streak screen with display-only data. */
export function StreakCompletionPreview(): React.ReactNode {
  const [variant, setVariant] = useState<StreakPreviewVariant>(null);

  return (
    <section className="rounded-2xl border border-orange-300/40 bg-linear-to-br from-orange-50 via-card to-amber-50 p-5 shadow-sm dark:from-orange-950/25 dark:via-card dark:to-amber-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Streak celebration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Preview, close, and share the dedicated daily-streak milestone.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Button type="button" variant="outline" onClick={() => setVariant("daily")}>
            Daily
          </Button>
          <Button
            type="button"
            className="bg-orange-500 font-black text-white hover:bg-orange-400"
            onClick={() => setVariant("level")}
          >
            <FlameIcon className="fill-current" aria-hidden="true" />
            New level
          </Button>
          <Button type="button" variant="outline" onClick={() => setVariant("reset")}>
            Reset
          </Button>
        </div>
      </div>

      {variant && (
        <StreakCompletionScreen
          streak={{
            status: variant === "reset" ? "reset" : "increased",
            currentStreak: variant === "reset" ? 1 : variant === "level" ? 7 : 8,
            bestStreak: variant === "reset" ? 12 : variant === "level" ? 7 : 12,
            isNewBest: variant === "level",
            previousBestStreak: variant === "reset" ? 12 : variant === "level" ? 6 : 12,
            levelName: variant === "level" ? "Steady Flame" : "Spark",
            reachedNewLevel: variant === "level",
            forecast: createPreviewForecast(
              variant === "reset" ? 1 : variant === "level" ? 7 : 8,
              variant === "reset" ? 2 : variant === "level" ? 7 : 6,
            ),
            nextLevel:
              variant === "reset"
                ? {
                    name: "Kindling",
                    minimumDays: 3,
                    daysRemaining: 2,
                    projectedDateKey: "2026-07-30",
                    projectedDateLabel: "Jul 30, 2026",
                  }
                : {
                    name: "Beacon",
                    minimumDays: 14,
                    daysRemaining: variant === "level" ? 7 : 6,
                    projectedDateKey: "2026-08-04",
                    projectedDateLabel: "Aug 4, 2026",
                  },
          }}
          onContinue={() => setVariant(null)}
        />
      )}
    </section>
  );
}
