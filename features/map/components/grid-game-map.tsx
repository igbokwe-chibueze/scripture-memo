"use client";

/**
 * Paginated card-grid presentation used as Map B. It shares progression data and
 * selection behavior with Map A while retaining the richer stage/reference view.
 */

import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, Grid2X2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GridWaypointCard } from "@/features/map/components/grid-waypoint-card";
import { groupMapWaypoints } from "@/features/map/lib/map-utils";
import type { MapWaypoint } from "@/features/map/types/map.types";
import { cn } from "@/lib/utils";

/**
 * Renders one ten-waypoint grid section at a time.
 * Grouping is derived from the server DTO, and the initial section follows the
 * learner's current node so an expanding curriculum remains easy to resume.
 */
export function GridGameMap({
  waypoints,
  onSelectWaypoint,
}: {
  waypoints: MapWaypoint[];
  onSelectWaypoint: (waypoint: MapWaypoint) => void;
}): React.ReactNode {
  const groups = useMemo(() => groupMapWaypoints(waypoints), [waypoints]);
  // A missing current node is valid when everything is complete/locked; clamp
  // `findIndex`'s -1 to the predictable first group.
  const initialGroupIndex = Math.max(
    0,
    groups.findIndex((group) => group.waypoints.some(({ isCurrent }) => isCurrent)),
  );
  const [activeGroupIndex, setActiveGroupIndex] = useState(initialGroupIndex);
  const activeGroup = groups[activeGroupIndex] ?? groups[0];

  // The parent normally supplies an EmptyState, but defensive reuse with an
  // empty list should still render safely.
  if (!activeGroup) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase">
            Campaign grid
          </p>
          <h2 className="mt-1 font-heading text-2xl font-bold">
            Waypoints {activeGroup.startNumber}–{activeGroup.endNumber}
          </h2>
        </div>
        <span className="hidden items-center gap-2 text-sm text-muted-foreground sm:inline-flex">
          <Grid2X2Icon className="size-4" aria-hidden="true" />
          Group {activeGroupIndex + 1} of {groups.length}
        </span>
      </div>

      <nav aria-label="Grid waypoint groups" className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 shrink-0 rounded-full"
          disabled={activeGroupIndex === 0}
          onClick={() => setActiveGroupIndex((index) => Math.max(0, index - 1))}
          aria-label="Show previous waypoint group"
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>

        <div className="flex flex-1 snap-x gap-2 overflow-x-auto px-1 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Labels use actual boundaries so numbering gaps stay truthful. */}
          {groups.map((group) => (
            <button
              key={group.index}
              type="button"
              onClick={() => setActiveGroupIndex(group.index)}
              aria-current={group.index === activeGroupIndex ? "page" : undefined}
              className={cn(
                "min-h-11 shrink-0 snap-center rounded-full border px-4 text-sm font-semibold outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50",
                group.index === activeGroupIndex
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {group.startNumber}–{group.endNumber}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 shrink-0 rounded-full"
          disabled={activeGroupIndex === groups.length - 1}
          onClick={() => setActiveGroupIndex((index) => Math.min(groups.length - 1, index + 1))}
          aria-label="Show next waypoint group"
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </nav>

      <p className="sr-only" aria-live="polite">
        Showing waypoints {activeGroup.startNumber} through {activeGroup.endNumber}.
      </p>

      {/* One column below 360px prevents stage labels and flames from clipping;
          wider mobile screens retain the compact two-column game layout. */}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:gap-4 lg:grid-cols-5">
        {activeGroup.waypoints.map((waypoint) => (
          <GridWaypointCard
            key={waypoint.id}
            waypoint={waypoint}
            onSelect={onSelectWaypoint}
          />
        ))}
      </div>
    </div>
  );
}
