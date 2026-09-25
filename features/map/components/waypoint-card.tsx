"use client";

/**
 * Compact tactile waypoint node used by Map A's mobile winding trail. Scripture
 * reference and Journey Stage are deliberately omitted here; players see that
 * detail after entering the waypoint, leaving this map focused on progress.
 */

import { useTranslations } from "next-intl";
import { FlameIndicator } from "@/components/shared/flame-indicator";
import { TrailWaypointButton } from "@/features/map/components/trail-waypoint-button";
import type { MapWaypoint } from "@/features/map/types/map.types";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const statusPresentation: Record<WaypointStatus, { label: string }> = {
  LOCKED: { label: "Locked" },
  UNLOCKED: { label: "Ready" },
  IN_PROGRESS: { label: "In progress" },
  COOLDOWN: { label: "Cooling down" },
  COMPLETED: { label: "Complete" },
};

/**
 * Renders a responsive campaign node with status and three-day flame progress.
 * Mobile controls shrink to 64px (72px for the current node), then restore the
 * original 80px/96px presentation from the `sm` breakpoint. Both sizes remain
 * comfortably above the required 44px touch target. Locked nodes stay focusable
 * so the shared controller can explain their prerequisite.
 */
export function WaypointCard({
  waypoint,
  mobileCalloutSide = "right",
  largeCalloutSide = "right",
  onSelect,
}: {
  waypoint: MapWaypoint;
  mobileCalloutSide?: "left" | "right";
  largeCalloutSide?: "left" | "right";
  onSelect: (waypoint: MapWaypoint) => void;
}): React.ReactNode {
  const t = useTranslations("Map");
  const presentation = statusPresentation[waypoint.status];
  const mobileCalloutPosition =
    mobileCalloutSide === "right" ? "left-full ml-2" : "right-full mr-2";
  const largeCalloutPosition =
    largeCalloutSide === "right"
      ? "sm:left-full sm:ml-3 sm:right-auto sm:mr-0"
      : "sm:right-full sm:mr-3 sm:left-auto sm:ml-0";
  const mobilePointerPosition =
    mobileCalloutSide === "right"
      ? "-left-1 border-b border-l"
      : "-right-1 border-t border-r";
  const largePointerPosition =
    largeCalloutSide === "right"
      ? "sm:-left-1 sm:border-b sm:border-l sm:border-t-0 sm:border-r-0"
      : "sm:-right-1 sm:border-t sm:border-r sm:border-b-0 sm:border-l-0";

  return (
    // The trail queries this marker once to center the learner's next action.
    // Omitting it on other nodes makes the DOM lookup unambiguous.
    <div
      data-current-waypoint={waypoint.isCurrent ? "true" : undefined}
      className="relative flex w-24 flex-col items-center sm:w-36"
    >
      <div className="relative">
        {waypoint.isCurrent && (
          <span
            className={cn(
              "absolute top-1/2 z-30 w-max -translate-y-1/2 rounded-lg border border-amber-300/70 bg-amber-50 px-2 py-1 text-center text-[0.55rem] font-black tracking-[0.1em] whitespace-nowrap text-amber-900 uppercase shadow-lg shadow-amber-500/15 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-[0.65rem] sm:tracking-[0.14em] dark:border-amber-500/35 dark:bg-amber-950/90 dark:text-amber-200",
              mobileCalloutPosition,
              largeCalloutPosition,
            )}
          >
            {t("continueHere")}
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1/2 size-2 -translate-y-1/2 rotate-45 border-amber-300/70 bg-amber-50 sm:size-2.5 dark:border-amber-500/35 dark:bg-amber-950",
                mobilePointerPosition,
                largePointerPosition,
              )}
            />
          </span>
        )}

        {waypoint.isCurrent && (
          // Decorative attention uses motion-safe so reduced-motion users keep
          // the static current ring without a pulsing animation.
          <span
            aria-hidden="true"
            className="absolute -inset-3 rounded-full bg-amber-400/30 motion-safe:animate-ping"
          />
        )}
        <TrailWaypointButton
          status={waypoint.status}
          isCurrent={waypoint.isCurrent}
          number={waypoint.number}
          flameCount={waypoint.flameCount}
          ariaLabel={t("waypointAria", {
            number: waypoint.number,
            status: t(`statuses.${waypoint.status}`),
            count: waypoint.flameCount,
          })}
          onClick={() => onSelect(waypoint)}
        />
      </div>

      <div className="mt-2 flex flex-col items-center text-center sm:mt-4">
        {/* Status remains available while the puck uses the supplied icons. */}
        <span className="sr-only">{presentation.label}</span>
        {/*
          The sprite flames inside the puck replace this visible count. Keeping
          the indicator invisible preserves its exact old width, height, and
          spacing so absolute map positions do not shift. The button's accessible
          name already announces the same count.
        */}
        <span aria-hidden="true">
          <FlameIndicator
            count={waypoint.flameCount}
            compact
            className="invisible rounded-full bg-background/75 px-1.5 py-0.5 sm:px-2 sm:py-1"
          />
        </span>
      </div>
    </div>
  );
}
