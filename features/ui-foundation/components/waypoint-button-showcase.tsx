"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { GridWaypointCard, WaypointCard } from "@/features/map";
import type { MapWaypoint } from "@/features/map/types/map.types";
import { JourneyStage, WaypointStatus } from "@/lib/generated/prisma/enums";

const WAYPOINT_STATES = [
  { status: WaypointStatus.LOCKED, label: "Locked" },
  { status: WaypointStatus.UNLOCKED, label: "Ready" },
  { status: WaypointStatus.IN_PROGRESS, label: "In progress" },
  { status: WaypointStatus.COOLDOWN, label: "Cooldown" },
  { status: WaypointStatus.COMPLETED, label: "Completed" },
] as const;

/**
 * Previews the two custom map waypoint controls with local sample state only.
 * Status, current-node emphasis, and flame count can be changed here to inspect
 * the actual Map A and Map B components without creating or altering progress.
 */
export function WaypointButtonShowcase(): React.ReactNode {
  const [status, setStatus] = useState<WaypointStatus>(WaypointStatus.COMPLETED);
  const [isCurrent, setIsCurrent] = useState(true);
  const [flameCount, setFlameCount] = useState(3);

  const waypoint: MapWaypoint = {
    id: "waypoint-button-preview",
    number: 101,
    reference: "Psalm 23:1",
    journeyStage: JourneyStage.LEARN,
    status,
    flameCount,
    isCurrent,
    trailThemeId: "coastal",
  };

  const previewSelection = (): void => {
    toast.info("Visual preview only. No game progress will change.");
  };

  return (
    <section
      id="waypoint-buttons"
      className="scroll-mt-24 space-y-5 rounded-3xl border bg-card p-4 shadow-sm sm:p-6"
      aria-labelledby="waypoint-button-showcase-title"
    >
      <div>
        <p className="text-xs font-black tracking-[0.18em] text-primary uppercase">
          Custom map controls
        </p>
        <h2
          id="waypoint-button-showcase-title"
          className="mt-1 font-heading text-2xl font-black"
        >
          Waypoint buttons
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          These are the real Map A trail node and Map B waypoint card. Change the
          sample state below to review their customized appearance; clicking a
          sample only shows a notice and never changes player progress.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border bg-background p-3 sm:p-4">
        <div className="space-y-2">
          <h3 className="font-heading font-black">Waypoint state</h3>
          <div className="flex flex-wrap gap-2">
            {WAYPOINT_STATES.map((item) => (
              <Button
                key={item.status}
                type="button"
                size="sm"
                variant={status === item.status ? "default" : "outline"}
                aria-pressed={status === item.status}
                className="min-h-11"
                onClick={() => setStatus(item.status)}
              >
                {item.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={isCurrent ? "secondary" : "outline"}
              aria-pressed={isCurrent}
              className="min-h-11"
              onClick={() => setIsCurrent((current) => !current)}
            >
              {isCurrent ? "Current waypoint" : "Mark as current"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-heading font-black">Completed challenge days</h3>
          <div className="flex flex-wrap gap-2" aria-label="Flame progress">
            {[0, 1, 2, 3].map((count) => (
              <Button
                key={count}
                type="button"
                size="sm"
                variant={flameCount === count ? "default" : "outline"}
                aria-pressed={flameCount === count}
                className="min-h-11 min-w-11"
                onClick={() => setFlameCount(count)}
              >
                {count}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <article className="min-w-0 rounded-2xl border bg-background p-4">
          <h3 className="font-heading text-lg font-black">Map A · Trail node</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Layered sprite puck, live number, current marker, and day flames.
          </p>
          <div className="flex min-h-64 items-center justify-center overflow-hidden pt-10">
            <WaypointCard waypoint={waypoint} onSelect={previewSelection} />
          </div>
        </article>

        <article className="min-w-0 rounded-2xl border bg-background p-4">
          <h3 className="font-heading text-lg font-black">Map B · Waypoint card</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Reference, Journey Stage, status, and flame progress in one touch target.
          </p>
          <div className="mt-4">
            <GridWaypointCard waypoint={waypoint} onSelect={previewSelection} />
          </div>
        </article>
      </div>
    </section>
  );
}
