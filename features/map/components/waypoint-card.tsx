"use client";

import {
  BookOpenIcon,
  CheckIcon,
  Clock3Icon,
  LockKeyholeIcon,
  PlayIcon,
} from "lucide-react";
import { FlameIndicator } from "@/components/shared/flame-indicator";
import type { MapWaypoint } from "@/features/map/types/map.types";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const statusPresentation: Record<
  WaypointStatus,
  { label: string; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  LOCKED: { label: "Locked", icon: LockKeyholeIcon },
  UNLOCKED: { label: "Ready", icon: PlayIcon },
  IN_PROGRESS: { label: "In progress", icon: BookOpenIcon },
  COOLDOWN: { label: "Cooling down", icon: Clock3Icon },
  COMPLETED: { label: "Complete", icon: CheckIcon },
};

/**
 * Draws three honest ring segments—one for each completed challenge day.
 * Decorative tension never inflates progress beyond the persisted flame count.
 */
function WaypointProgressRing({ count }: { count: number }): React.ReactNode {
  const safeCount = Math.max(0, Math.min(3, count));

  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="pointer-events-none absolute -inset-2 size-[calc(100%+1rem)] -rotate-90"
    >
      {[0, 1, 2].map((index) => (
        <circle
          key={index}
          cx="50"
          cy="50"
          r="45"
          pathLength="100"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="27 73"
          strokeDashoffset={-index * 33.33}
          className={cn(
            "transition-colors duration-300 motion-reduce:transition-none",
            index < safeCount
              ? "stroke-amber-400 drop-shadow-[0_1px_1px_rgb(245_158_11/0.45)]"
              : "stroke-foreground/12",
          )}
        />
      ))}
    </svg>
  );
}

/** Tactile campaign node designed for thumb-first map navigation. */
export function WaypointCard({
  waypoint,
  onSelect,
}: {
  waypoint: MapWaypoint;
  onSelect: (waypoint: MapWaypoint) => void;
}): React.ReactNode {
  const isLocked = waypoint.status === WaypointStatus.LOCKED;
  const isCompleted = waypoint.status === WaypointStatus.COMPLETED;
  const presentation = statusPresentation[waypoint.status];
  const StatusIcon = presentation.icon;

  return (
    <div
      data-current-waypoint={waypoint.isCurrent ? "true" : undefined}
      className="relative flex w-36 flex-col items-center"
    >
      {waypoint.isCurrent && (
        <span className="absolute -top-12 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-1.5 text-center text-[0.65rem] font-black tracking-[0.14em] whitespace-nowrap text-amber-900 uppercase shadow-lg shadow-amber-500/15 dark:border-amber-500/35 dark:bg-amber-950/90 dark:text-amber-200">
          Continue here
          <span
            aria-hidden="true"
            className="absolute top-7 left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-r border-b border-amber-300/70 bg-amber-50 dark:border-amber-500/35 dark:bg-amber-950"
          />
        </span>
      )}

      <div className="relative">
        {waypoint.isCurrent && (
          <span
            aria-hidden="true"
            className="absolute -inset-3 rounded-full bg-amber-400/30 motion-safe:animate-ping"
          />
        )}
        <WaypointProgressRing count={waypoint.flameCount} />
        <button
          type="button"
          aria-disabled={isLocked}
          aria-label={`Waypoint ${waypoint.number}, ${presentation.label}, ${waypoint.flameCount} of 3 days complete`}
          onClick={() => onSelect(waypoint)}
          className={cn(
            "group relative grid size-20 place-items-center rounded-full border-4 text-xl font-black shadow-[0_7px_0_0_rgb(0_0_0/0.16),0_12px_22px_rgb(0_0_0/0.14)] outline-none transition duration-200 focus-visible:ring-4 focus-visible:ring-ring/50 active:translate-y-1 active:shadow-[0_3px_0_0_rgb(0_0_0/0.16)] motion-reduce:transition-none",
            isLocked &&
              "border-zinc-300 bg-zinc-200 text-zinc-500 shadow-[0_7px_0_0_rgb(113_113_122/0.35),0_12px_20px_rgb(0_0_0/0.08)] dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
            !isLocked && !isCompleted &&
              "border-emerald-300 bg-linear-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_7px_0_0_rgb(4_120_87/0.8),0_12px_24px_rgb(16_185_129/0.28)] hover:from-emerald-300 hover:to-emerald-500",
            isCompleted &&
              "border-sky-300 bg-linear-to-b from-sky-400 to-sky-600 text-white shadow-[0_7px_0_0_rgb(3_105_161/0.75),0_12px_24px_rgb(14_165_233/0.24)] hover:from-sky-300 hover:to-sky-500",
            waypoint.status === WaypointStatus.COOLDOWN &&
              "border-violet-300 from-violet-400 to-violet-600 shadow-[0_7px_0_0_rgb(109_40_217/0.75),0_12px_24px_rgb(139_92_246/0.25)]",
            waypoint.isCurrent && "size-24 border-amber-200 ring-4 ring-amber-400/35",
          )}
        >
          <span className="flex flex-col items-center leading-none">
            <StatusIcon className="mb-1 size-5" aria-hidden={true} />
            <span>{waypoint.number}</span>
          </span>
          <span
            aria-hidden="true"
            className="absolute inset-x-3 top-2 h-2 rounded-full bg-white/25 blur-[0.5px]"
          />
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center text-center">
        <span className="sr-only">{presentation.label}</span>
        <FlameIndicator count={waypoint.flameCount} className="rounded-full bg-background/75 px-2 py-1" />
      </div>
    </div>
  );
}
