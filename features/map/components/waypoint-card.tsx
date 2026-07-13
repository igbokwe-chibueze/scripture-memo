"use client";

import { CheckCircle2Icon, Clock3Icon, LockKeyholeIcon, MapPinIcon } from "lucide-react";
import { FlameIndicator } from "@/components/shared/flame-indicator";
import { JourneyStageBadge } from "@/components/shared/journey-stage-badge";
import type { MapWaypoint } from "@/features/map/types/map.types";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const statusPresentation: Record<WaypointStatus, { label: string; icon: React.ReactNode }> = {
  LOCKED: { label: "Locked", icon: <LockKeyholeIcon aria-hidden="true" /> },
  UNLOCKED: { label: "Ready", icon: <MapPinIcon aria-hidden="true" /> },
  IN_PROGRESS: { label: "In progress", icon: <MapPinIcon aria-hidden="true" /> },
  COOLDOWN: { label: "Cooling down", icon: <Clock3Icon aria-hidden="true" /> },
  COMPLETED: { label: "Complete", icon: <CheckCircle2Icon aria-hidden="true" /> },
};

/** Tactile, keyboard-accessible campaign node for one published waypoint. */
export function WaypointCard({
  waypoint,
  onSelect,
}: {
  waypoint: MapWaypoint;
  onSelect: (waypoint: MapWaypoint) => void;
}): React.ReactNode {
  const isLocked = waypoint.status === WaypointStatus.LOCKED;
  const presentation = statusPresentation[waypoint.status];

  return (
    <button
      type="button"
      aria-disabled={isLocked}
      aria-label={`Waypoint ${waypoint.number}, ${presentation.label}, ${waypoint.reference}`}
      onClick={() => onSelect(waypoint)}
      className={cn(
        "group relative flex min-h-48 w-full flex-col overflow-hidden rounded-3xl border p-4 text-left shadow-sm outline-none transition duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] motion-reduce:transition-none",
        isLocked && "border-border/60 bg-card/55 text-muted-foreground shadow-none",
        waypoint.status === WaypointStatus.COMPLETED &&
          "border-emerald-500/25 bg-emerald-500/7 hover:border-emerald-500/45",
        !isLocked && waypoint.status !== WaypointStatus.COMPLETED &&
          "border-primary/25 bg-card hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg motion-reduce:hover:translate-y-0",
        waypoint.isCurrent &&
          "border-amber-400/70 bg-linear-to-br from-amber-100/80 via-card to-primary/8 shadow-lg shadow-amber-500/10 ring-2 ring-amber-400/30 dark:from-amber-950/35",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute -top-7 -right-7 size-24 rounded-full bg-primary/5 transition-transform group-hover:scale-110",
          waypoint.isCurrent && "bg-amber-400/15",
        )}
      />

      <span className="relative flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl bg-muted text-lg font-black",
            !isLocked && "bg-primary text-primary-foreground",
            waypoint.status === WaypointStatus.COMPLETED && "bg-emerald-600 text-white",
            waypoint.isCurrent && "bg-amber-500 text-amber-950",
          )}
        >
          {waypoint.number}
        </span>
        <JourneyStageBadge stage={waypoint.journeyStage} />
      </span>

      <span className="relative mt-4 line-clamp-2 min-h-10 text-sm font-semibold text-foreground">
        {waypoint.reference}
      </span>

      <span className="relative mt-auto flex items-end justify-between gap-3 pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold [&_svg]:size-4">
          {presentation.icon}
          {presentation.label}
        </span>
        <FlameIndicator count={waypoint.flameCount} />
      </span>

      {waypoint.isCurrent && (
        <span className="absolute right-4 bottom-12 rounded-full bg-amber-500 px-2 py-0.5 text-[0.65rem] font-black tracking-wider text-amber-950 uppercase">
          You are here
        </span>
      )}
    </button>
  );
}
