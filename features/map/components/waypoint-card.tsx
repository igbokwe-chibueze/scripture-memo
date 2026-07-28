"use client";

/**
 * Compact tactile waypoint node used by Map A's mobile winding trail. Scripture
 * reference and Journey Stage are deliberately omitted here; players see that
 * detail after entering the waypoint, leaving this map focused on progress.
 */

import {
  BookOpenIcon,
  CheckIcon,
  Clock3Icon,
  LockKeyholeIcon,
  PlayIcon,
} from "lucide-react";
import { FlameIndicator } from "@/components/shared/flame-indicator";
import { TrailWaypointButton } from "@/features/map/components/trail-waypoint-button";
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
/**
 * SVG `pathLength="100"` makes each 27-unit dash roughly one third of the ring,
 * while 33.33-unit offsets distribute the three challenge-day segments evenly.
 * Clamping is defensive display behavior and never awards completion.
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

/**
 * Renders a responsive campaign node with status and three-day flame progress.
 * Mobile controls shrink to 64px (72px for the current node), then restore the
 * original 80px/96px presentation from the `sm` breakpoint. Both sizes remain
 * comfortably above the required 44px touch target. Locked nodes stay focusable
 * so the shared controller can explain their prerequisite.
 */
export function WaypointCard({
  waypoint,
  onSelect,
}: {
  waypoint: MapWaypoint;
  onSelect: (waypoint: MapWaypoint) => void;
}): React.ReactNode {
  const presentation = statusPresentation[waypoint.status];
  const StatusIcon = presentation.icon;

  return (
    // The trail queries this marker once to center the learner's next action.
    // Omitting it on other nodes makes the DOM lookup unambiguous.
    <div
      data-current-waypoint={waypoint.isCurrent ? "true" : undefined}
      className="relative flex w-24 flex-col items-center sm:w-36"
    >
      {waypoint.isCurrent && (
        <span className="absolute -top-9 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-amber-300/70 bg-amber-50 px-2 py-1 text-center text-[0.55rem] font-black tracking-[0.1em] whitespace-nowrap text-amber-900 uppercase shadow-lg shadow-amber-500/15 sm:-top-12 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-[0.65rem] sm:tracking-[0.14em] dark:border-amber-500/35 dark:bg-amber-950/90 dark:text-amber-200">
          Continue here
          <span
            aria-hidden="true"
            className="absolute top-5 left-1/2 size-2 -translate-x-1/2 rotate-45 border-r border-b border-amber-300/70 bg-amber-50 sm:top-7 sm:size-2.5 dark:border-amber-500/35 dark:bg-amber-950"
          />
        </span>
      )}

      <div className="relative">
        {waypoint.isCurrent && (
          // Decorative attention uses motion-safe so reduced-motion users keep
          // the static current ring without a pulsing animation.
          <span
            aria-hidden="true"
            className="absolute -inset-3 rounded-full bg-amber-400/30 motion-safe:animate-ping"
          />
        )}
        <WaypointProgressRing count={waypoint.flameCount} />
        <TrailWaypointButton
          status={waypoint.status}
          isCurrent={waypoint.isCurrent}
          ariaLabel={`Waypoint ${waypoint.number}, ${presentation.label}, ${waypoint.flameCount} of 3 days complete`}
          onClick={() => onSelect(waypoint)}
        >
          <span className="flex flex-col items-center leading-none">
            <StatusIcon className="mb-0.5 size-4 sm:mb-1 sm:size-5" aria-hidden={true} />
            <span>{waypoint.number}</span>
          </span>
        </TrailWaypointButton>
      </div>

      <div className="mt-2 flex flex-col items-center text-center sm:mt-4">
        {/* Status remains available to assistive technology while visible Map A
            content stays intentionally limited to the flame indicator. */}
        <span className="sr-only">{presentation.label}</span>
        <FlameIndicator
          count={waypoint.flameCount}
          compact
          className="rounded-full bg-background/75 px-1.5 py-0.5 sm:px-2 sm:py-1"
        />
      </div>
    </div>
  );
}
