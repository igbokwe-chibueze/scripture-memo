"use client";

/**
 * Continuous mobile-first campaign trail used as Map A.
 *
 * Each five-waypoint group owns one complete 9:16 illustration. The component
 * opens at the player's current group, keeps earlier history above it, and
 * progressively mounts more groups in either scroll direction. All curriculum
 * and progression decisions still come from the server-provided waypoint DTOs.
 */

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { FlagIcon, LocateFixedIcon, MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrailNavigator } from "@/features/map/components/trail-navigator";
import { WaypointCard } from "@/features/map/components/waypoint-card";
import { getMapTheme } from "@/features/map/data/map-themes";
import { groupMapWaypoints } from "@/features/map/lib/map-utils";
import type { MapWaypoint } from "@/features/map/types/map.types";

const TRAIL_MAP_GROUP_SIZE = 5;
const INITIAL_NEIGHBOR_COUNT = 1;

/** CSS variables let Tailwind switch percentage coordinates at its 640px `sm` breakpoint. */
type ResponsiveNodeStyle = CSSProperties & {
  "--map-mobile-x": string;
  "--map-mobile-y": string;
  "--map-large-x": string;
  "--map-large-y": string;
};

type VisibleGroupRange = {
  /** Inclusive index of the earliest mounted map. */
  start: number;
  /** Inclusive index of the latest mounted map. */
  end: number;
};

type PrependAnchor = {
  /** Group that must retain its viewport position after history is inserted. */
  groupIndex: number;
  /** Its pre-insertion distance from the top of the viewport. */
  viewportTop: number;
};

/**
 * Renders Map A as one continuous scrollable history.
 *
 * One neighboring map is mounted above and below the current map initially, so
 * both directions feel immediate. Intersection observers then extend the DOM by
 * one map near either boundary. Earlier groups are prepended with anchor
 * correction, preventing the browser from visually jumping the player when new
 * history appears above their viewport. This is client-side progressive
 * rendering of already-authorized DTOs; it performs no database reads or writes.
 */
export function WindingTrailMap({
  waypoints,
  onSelectWaypoint,
}: {
  waypoints: MapWaypoint[];
  onSelectWaypoint: (waypoint: MapWaypoint) => void;
}): React.ReactNode {
  const trailRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const centeredCurrentRef = useRef(false);
  const prependAnchorRef = useRef<PrependAnchor | null>(null);
  const requestedGroupRef = useRef<number | null>(null);

  const groups = useMemo(
    () => groupMapWaypoints(waypoints, TRAIL_MAP_GROUP_SIZE),
    [waypoints],
  );
  const currentGroupIndex = Math.max(
    0,
    groups.findIndex((group) => group.waypoints.some(({ isCurrent }) => isCurrent)),
  );
  const [visibleRange, setVisibleRange] = useState<VisibleGroupRange>(() => ({
    start: Math.max(0, currentGroupIndex - INITIAL_NEIGHBOR_COUNT),
    end: Math.min(groups.length - 1, currentGroupIndex + INITIAL_NEIGHBOR_COUNT),
  }));

  const visibleGroups = groups.slice(visibleRange.start, visibleRange.end + 1);

  function navigateToGroup(groupIndex: number): void {
    // Distant jumps replace the small rendered window instead of mounting every
    // intervening trail. This keeps navigation fast as the curriculum grows.
    requestedGroupRef.current = groupIndex;
    setVisibleRange({
      start: Math.max(0, groupIndex - INITIAL_NEIGHBOR_COUNT),
      end: Math.min(groups.length - 1, groupIndex + INITIAL_NEIGHBOR_COUNT),
    });
  }

  useLayoutEffect(() => {
    const requestedGroup = requestedGroupRef.current;
    if (requestedGroup === null) return;

    const destination = trailRef.current?.querySelector<HTMLElement>(
      `[data-map-group-index="${requestedGroup}"]`,
    );
    if (!destination) return;

    // Respect the operating-system motion preference even when the saved app
    // setting has not hydrated yet. Navigation remains immediate and complete.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    destination.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    requestedGroupRef.current = null;
  }, [visibleRange]);

  useEffect(() => {
    if (centeredCurrentRef.current) return;
    const currentNode = trailRef.current?.querySelector<HTMLElement>(
      '[data-current-waypoint="true"]',
    );
    if (!currentNode) return;

    // Stable image aspect ratios reserve layout before loading, so centering the
    // current control once does not drift as the PNG becomes visible.
    currentNode.scrollIntoView({ block: "center", behavior: "auto" });
    centeredCurrentRef.current = true;
  }, []);

  useLayoutEffect(() => {
    const anchor = prependAnchorRef.current;
    if (!anchor) return;

    const anchoredGroup = trailRef.current?.querySelector<HTMLElement>(
      `[data-map-group-index="${anchor.groupIndex}"]`,
    );
    if (anchoredGroup) {
      // Compensate by the exact inserted height rather than guessing from image
      // dimensions. This also accounts for headings, gaps, and responsive CSS.
      window.scrollBy({
        top: anchoredGroup.getBoundingClientRect().top - anchor.viewportTop,
        behavior: "auto",
      });
    }
    prependAnchorRef.current = null;
  }, [visibleRange.start]);

  useEffect(() => {
    if (groups.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          if (entry.target === topSentinelRef.current) {
            setVisibleRange((currentRange) => {
              if (currentRange.start === 0) return currentRange;

              const firstMountedGroup = trailRef.current?.querySelector<HTMLElement>(
                `[data-map-group-index="${currentRange.start}"]`,
              );
              if (firstMountedGroup) {
                prependAnchorRef.current = {
                  groupIndex: currentRange.start,
                  viewportTop: firstMountedGroup.getBoundingClientRect().top,
                };
              }

              return { ...currentRange, start: currentRange.start - 1 };
            });
          }

          if (entry.target === bottomSentinelRef.current) {
            setVisibleRange((currentRange) =>
              currentRange.end >= groups.length - 1
                ? currentRange
                : { ...currentRange, end: currentRange.end + 1 },
            );
          }
        }
      },
      // Prefetch shortly before a boundary enters view, avoiding a blank pause
      // without mounting all 220+ curriculum controls on initial render.
      { rootMargin: "320px 0px", threshold: 0.01 },
    );

    const topSentinel = topSentinelRef.current;
    const bottomSentinel = bottomSentinelRef.current;
    if (topSentinel) observer.observe(topSentinel);
    if (bottomSentinel) observer.observe(bottomSentinel);

    return () => observer.disconnect();
  }, [groups.length]);

  // The parent owns the route-level empty state; defensive reuse remains safe.
  if (groups.length === 0) return null;

  return (
    <div ref={trailRef} className="mx-auto w-full max-w-[30rem]">
      <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-40 flex items-center gap-2 sm:right-6">
        <Button
          type="button"
          aria-label="Back to current trail"
          title="Back to current trail"
          variant="outline"
          size="icon-lg"
          onClick={() => navigateToGroup(currentGroupIndex)}
          className="size-12 rounded-full bg-card/95 shadow-lg backdrop-blur-sm"
        >
          <LocateFixedIcon className="size-5" aria-hidden="true" />
        </Button>
        <TrailNavigator
          groups={groups}
          currentGroupIndex={currentGroupIndex}
          onNavigate={navigateToGroup}
        />
      </div>
      <div ref={topSentinelRef} className="h-px" aria-hidden="true" />

      <div className="space-y-7">
        {visibleGroups.map((group) => {
          const theme = getMapTheme(group.index);

          return (
            <section
              key={group.index}
              data-map-group-index={group.index}
              aria-labelledby={`trail-map-heading-${group.index}`}
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-4 px-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[0.65rem] font-black tracking-[0.16em] text-emerald-700 uppercase dark:text-emerald-300">
                    <MapIcon className="size-3.5" aria-hidden="true" />
                    Trail {group.index + 1}
                  </p>
                  <h2
                    id={`trail-map-heading-${group.index}`}
                    className="font-heading text-lg font-black"
                  >
                    Waypoints {group.startNumber}–{group.endNumber}
                  </h2>
                </div>
                {group.index === currentGroupIndex && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/80 dark:text-amber-200">
                    <FlagIcon className="size-3.5" aria-hidden="true" />
                    Current map
                  </span>
                )}
              </div>

              <div
                className="relative w-full overflow-hidden rounded-[2.25rem] border border-amber-200/40 bg-muted shadow-xl shadow-foreground/12 dark:border-amber-100/15"
                style={{ aspectRatio: `${theme.width} / ${theme.height}` }}
              >
                <Image
                  src={theme.imageSrc}
                  alt={theme.alt}
                  fill
                  loading={group.index === currentGroupIndex ? "eager" : "lazy"}
                  sizes="(max-width: 480px) 100vw, 480px"
                  className="pointer-events-none select-none object-fill"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/5 via-transparent to-black/15"
                />

                {group.waypoints.map((waypoint, waypointIndex) => {
                  const mobilePosition = theme.mobilePositions[waypointIndex];
                  const largePosition = theme.largePositions[waypointIndex];
                  if (!mobilePosition || !largePosition) return null;

                  const nodeStyle: ResponsiveNodeStyle = {
                    "--map-mobile-x": `${mobilePosition.x}%`,
                    "--map-mobile-y": `${mobilePosition.y}%`,
                    "--map-large-x": `${largePosition.x}%`,
                    "--map-large-y": `${largePosition.y}%`,
                  };

                  return (
                    <div
                      key={waypoint.id}
                      className="absolute z-10 top-[var(--map-mobile-y)] left-[var(--map-mobile-x)] -translate-x-1/2 -translate-y-1/2 sm:top-[var(--map-large-y)] sm:left-[var(--map-large-x)]"
                      style={nodeStyle}
                    >
                      <WaypointCard
                        waypoint={waypoint}
                        onSelect={onSelectWaypoint}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div ref={bottomSentinelRef} className="h-px" aria-hidden="true" />
      {visibleRange.end === groups.length - 1 && (
        <p className="py-8 text-center text-sm font-semibold text-muted-foreground">
          End of the currently published trail
        </p>
      )}
    </div>
  );
}
