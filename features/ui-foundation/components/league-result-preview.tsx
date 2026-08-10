"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LeagueResultDialog,
  type LeagueResultOutcome,
} from "@/features/notifications/components/league-result-dialog";

/** Replays all weekly placement outcomes without reading or writing player data. */
export function LeagueResultPreview(): React.ReactNode {
  const [outcome, setOutcome] = useState<LeagueResultOutcome | null>(null);

  return (
    <section className="space-y-4 rounded-3xl border bg-card p-4">
      <div>
        <p className="text-xs font-black tracking-[0.18em] text-primary uppercase">
          Weekly result
        </p>
        <h2 className="mt-1 font-heading text-xl font-black">League notices</h2>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["promoted", "stayed", "demoted"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            variant={value === "promoted" ? "default" : "outline"}
            onClick={() => setOutcome(value)}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Button>
        ))}
      </div>

      {outcome && (
        <LeagueResultDialog
          open
          outcome={outcome}
          league={outcome === "promoted" ? "Disciple" : "Traveler"}
          finalRank={outcome === "promoted" ? 3 : 12}
          crownAward={0}
          onContinue={() => setOutcome(null)}
        />
      )}
    </section>
  );
}
