"use client";

/**
 * Mobile-first winding campaign presentation used as Map A. Its landscape and
 * route are code-native, keeping the UI responsive and independent of a fixed or
 * externally copyrighted background illustration.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  LeafIcon,
  MapIcon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaypointCard } from "@/features/map/components/waypoint-card";
import { groupMapWaypoints } from "@/features/map/lib/map-utils";
import type { MapWaypoint } from "@/features/map/types/map.types";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

// One stable coordinate height lets the SVG road and absolute node controls use
// the same system without runtime measurement for each ten-node section.
const TRAIL_HEIGHT = 1_340;

// Ten positions match the product group size. Alternating X percentages create
// the winding rhythm; 120px Y spacing prevents the enlarged current node, ring,
// and flames from colliding on narrow mobile screens.
const TRAIL_NODE_POSITIONS = [
  { x: 50, y: 60 },
  { x: 25, y: 180 },
  { x: 60, y: 300 },
  { x: 76, y: 420 },
  { x: 43, y: 540 },
  { x: 23, y: 660 },
  { x: 48, y: 780 },
  { x: 76, y: 900 },
  { x: 56, y: 1_020 },
  { x: 28, y: 1_140 },
] as const;

/**
 * Builds a smooth cubic Bézier trail through the active node centers.
 * X percentages become the SVG's 360-unit coordinates via 3.6, while the 48px
 * Y offset targets the button center. Midpoint control points produce gentle
 * vertical curves without a charting dependency; empty input returns no path.
 */
function buildTrailPath(nodeCount: number): string {
  const points = TRAIL_NODE_POSITIONS.slice(0, nodeCount).map(({ x, y }) => ({
    x: x * 3.6,
    y: y + 48,
  }));
  const first = points[0];
  if (!first) return "";

  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    if (!previous) return path;
    const middleY = (previous.y + point.y) / 2;
    return `${path} C ${previous.x} ${middleY}, ${point.x} ${middleY}, ${point.x} ${point.y}`;
  }, `M ${first.x} ${first.y}`);
}

/**
 * Adds lightweight atmosphere without competing with node controls. The whole
 * layer is pointer-transparent and accessibility-hidden because none of these
 * decorative shapes communicates gameplay state.
 */
function TrailScenery(): React.ReactNode {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2.5rem]">
      <div className="absolute -top-20 -left-20 size-56 rounded-full bg-sky-300/25 blur-2xl dark:bg-sky-700/15" />
      <div className="absolute top-52 -right-20 size-64 rounded-full bg-emerald-300/30 blur-2xl dark:bg-emerald-800/15" />
      <div className="absolute bottom-44 -left-24 size-64 rounded-full bg-amber-200/35 blur-2xl dark:bg-amber-800/10" />

      <LeafIcon className="absolute top-36 right-[12%] size-8 rotate-12 text-emerald-600/25" />
      <SparklesIcon className="absolute top-[31%] left-[8%] size-7 text-amber-500/35" />
      <LeafIcon className="absolute top-[48%] right-[8%] size-10 -rotate-12 text-emerald-600/20" />
      <SparklesIcon className="absolute top-[66%] left-[12%] size-6 text-sky-500/30" />
      <LeafIcon className="absolute right-[13%] bottom-28 size-8 rotate-45 text-emerald-600/25" />

      <div className="absolute top-[21%] left-[7%] flex gap-1">
        <span className="size-3 rounded-full bg-emerald-500/20" />
        <span className="mt-2 size-2 rounded-full bg-emerald-500/15" />
        <span className="size-4 rounded-full bg-emerald-500/20" />
      </div>
      <div className="absolute right-[8%] bottom-[22%] flex gap-1">
        <span className="size-4 rounded-full bg-sky-500/15" />
        <span className="mt-2 size-2 rounded-full bg-sky-500/20" />
        <span className="size-3 rounded-full bg-sky-500/15" />
      </div>
    </div>
  );
}

/**
 * Renders one winding ten-waypoint section for comparison variant A.
 * It opens on the current section, centers that node once, and delegates every
 * click to the shared controller; this component never mutates progression.
 */
export function WindingTrailMap({
  waypoints,
  onSelectWaypoint,
}: {
  waypoints: MapWaypoint[];
  onSelectWaypoint: (waypoint: MapWaypoint) => void;
}): React.ReactNode {
  const trailRef = useRef<HTMLDivElement>(null);
  // Strict Mode may repeat effects in development. This ref prevents a second
  // scroll jump after the learner/browser has established viewport position.
  const centeredCurrentRef = useRef(false);
  const groups = useMemo(() => groupMapWaypoints(waypoints), [waypoints]);
  const initialGroupIndex = Math.max(
    0,
    groups.findIndex((group) => group.waypoints.some(({ isCurrent }) => isCurrent)),
  );
  const [activeGroupIndex, setActiveGroupIndex] = useState(initialGroupIndex);
  const activeGroup = groups[activeGroupIndex] ?? groups[0];

  useEffect(() => {
    if (centeredCurrentRef.current) return;
    const currentNode = trailRef.current?.querySelector<HTMLElement>(
      '[data-current-waypoint="true"]',
    );
    if (!currentNode) return;

    // Auto-centering mirrors native campaign maps. `auto` avoids forced animated
    // motion and therefore respects reduced-motion expectations.
    currentNode.scrollIntoView({ block: "center", behavior: "auto" });
    centeredCurrentRef.current = true;
  }, []);

  // The view normally owns the empty state, but direct reuse remains safe.
  if (!activeGroup) return null;

  const trailPath = buildTrailPath(activeGroup.waypoints.length);
  // Reveal the route only to the furthest truthful milestone. This supports the
  // current section and fully completed historical sections without fabricated
  // progress between nodes.
  const currentIndex = activeGroup.waypoints.findIndex(({ isCurrent }) => isCurrent);
  const lastCompletedIndex = activeGroup.waypoints.findLastIndex(
    ({ status }) => status === WaypointStatus.COMPLETED,
  );
  const reachedIndex = Math.max(currentIndex, lastCompletedIndex);
  const progressPercent = activeGroup.waypoints.length <= 1
    // A one-node partial group has no distance to divide; reaching its only node
    // represents all of that available path.
    ? reachedIndex >= 0 ? 100 : 0
    : Math.max(0, (reachedIndex / (activeGroup.waypoints.length - 1)) * 100);

  return (
    <div className="space-y-5">
      <div className="sticky top-3 z-30 mx-auto max-w-xl rounded-3xl border border-white/60 bg-background/90 p-3 shadow-xl shadow-foreground/5 backdrop-blur-xl dark:border-white/10">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-11 shrink-0 rounded-full"
            disabled={activeGroupIndex === 0}
            onClick={() => setActiveGroupIndex((index) => Math.max(0, index - 1))}
            aria-label="Show previous waypoint trail"
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Button>

          <div className="min-w-0 flex-1 text-center">
            <p className="flex items-center justify-center gap-1.5 text-[0.65rem] font-black tracking-[0.16em] text-emerald-700 uppercase dark:text-emerald-300">
              <MapIcon className="size-3.5" aria-hidden="true" />
              Trail {activeGroupIndex + 1} of {groups.length}
            </p>
            <h2 className="truncate font-heading text-lg font-black">
              Waypoints {activeGroup.startNumber}–{activeGroup.endNumber}
            </h2>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            className="size-11 shrink-0 rounded-full"
            disabled={activeGroupIndex === groups.length - 1}
            onClick={() => setActiveGroupIndex((index) => Math.min(groups.length - 1, index + 1))}
            aria-label="Show next waypoint trail"
          >
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-3 flex snap-x gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {groups.map((group) => (
            <button
              key={group.index}
              type="button"
              onClick={() => setActiveGroupIndex(group.index)}
              aria-current={group.index === activeGroupIndex ? "page" : undefined}
              aria-label={`Show waypoints ${group.startNumber} through ${group.endNumber}`}
              className={cn(
                "h-2.5 min-w-8 flex-1 snap-center rounded-full outline-none transition-all focus-visible:ring-3 focus-visible:ring-ring/50",
                group.index === activeGroupIndex
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/20 hover:bg-muted-foreground/35",
              )}
            />
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing waypoints {activeGroup.startNumber} through {activeGroup.endNumber}.
      </p>

      <div
        ref={trailRef}
        className="relative mx-auto w-full max-w-[30rem] overflow-hidden rounded-[2.5rem] border border-emerald-500/15 bg-linear-to-b from-sky-100 via-emerald-50 to-amber-50 shadow-2xl shadow-emerald-950/8 dark:from-sky-950/45 dark:via-emerald-950/25 dark:to-amber-950/20"
        style={{ height: TRAIL_HEIGHT }}
      >
        <TrailScenery />
        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-sky-300/25 to-transparent" />
        <FlagIcon className="absolute top-5 left-1/2 size-9 -translate-x-1/2 text-emerald-700/45" aria-hidden="true" />

        <svg
          viewBox={`0 0 360 ${TRAIL_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 size-full"
        >
          {/* Wide warm stroke forms the physical road beneath progression. */}
          <path
            d={trailPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="25"
            strokeLinecap="round"
            className="text-amber-200/90 drop-shadow-sm dark:text-amber-900/65"
          />
          {/* Normalized length allows a percentage reveal independent of the
              Bézier path's actual rendered pixel length. */}
          <path
            d={trailPath}
            pathLength="100"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${progressPercent} 100`}
            className="text-emerald-500/75"
          />
          {/* The dotted center line is depth treatment and never encodes state. */}
          <path
            d={trailPath}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2 12"
            className="text-amber-700/25 dark:text-amber-200/20"
          />
        </svg>

        {activeGroup.waypoints.map((waypoint, index) => {
          const position = TRAIL_NODE_POSITIONS[index];
          // Grouping guarantees at most ten items. This guard prevents a future
          // size mismatch from silently placing an extra node at the origin.
          if (!position) return null;

          return (
            <div
              key={waypoint.id}
              className="absolute z-10 -translate-x-1/2"
              style={{ left: `${position.x}%`, top: position.y }}
            >
              <WaypointCard waypoint={waypoint} onSelect={onSelectWaypoint} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
