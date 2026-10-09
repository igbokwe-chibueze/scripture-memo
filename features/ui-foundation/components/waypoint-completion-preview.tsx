"use client";

import { useState } from "react";
import { FlameIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaypointCompletionScreen } from "@/features/gameplay";

/**
 * Replays the production waypoint milestone without any persistence side effect.
 *
 * The preview deliberately supplies fixed display-only values and never invokes
 * a Server Action, repository, reward, cooldown, or progression transition.
 */
export function WaypointCompletionPreview(): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  const openPreview = (): void => {
    setIsOpen(true);
  };

  return (
    <section className="rounded-2xl border border-decoration-border/40 bg-linear-to-br from-reward via-card to-decoration p-5 shadow-sm dark:from-reward/25 dark:via-card dark:to-decoration/25">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Waypoint celebration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Repeatedly preview the real milestone screen without changing game data.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 rounded-game-action font-bold"
          onClick={openPreview}
        >
          <FlameIcon className="fill-current" aria-hidden="true" />
          Preview Waypoint Complete
        </Button>
      </div>

      {isOpen && (
        <WaypointCompletionScreen
          waypointNumber={1}
          verseReference="1 Corinthians 13:4–5"
          unlockedWaypointNumber={2}
          caughtUp={false}
          waypointRewardTotal={450}
          totalBalance={1_250}
          onContinue={() => setIsOpen(false)}
        />
      )}
    </section>
  );
}
