"use client";

import { useState } from "react";
import { FlameIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaypointCompletionScreen } from "@/features/gameplay/components/waypoint-completion-screen";

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
    <section className="rounded-2xl border border-orange-300/40 bg-linear-to-br from-amber-50 via-card to-orange-50 p-5 shadow-sm dark:from-amber-950/25 dark:via-card dark:to-orange-950/25">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold">Waypoint celebration</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Repeatedly preview the real milestone screen without changing game data.
          </p>
        </div>
        <Button
          type="button"
          className="min-h-11 rounded-xl bg-orange-500 font-black text-white hover:bg-orange-400"
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
