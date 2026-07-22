"use client";

/**
 * Map A's compact index for jumping between accessible five-waypoint trails.
 *
 * The navigator receives the same server-authorized waypoint DTO groups as the
 * visible trail. It derives presentation-only progress locally and never
 * unlocks curriculum, mutates progression, or performs another data request.
 */

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, FlagIcon, ListTreeIcon, LockKeyholeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getMapTheme } from "@/features/map/data/map-themes";
import type { MapWaypointGroup } from "@/features/map/types/map.types";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

export type TrailNavigatorProps = {
  /** Every published trail remains visible, including future locked trails. */
  groups: MapWaypointGroup[];
  /** The trail containing the learner's server-derived current waypoint. */
  currentGroupIndex: number;
  /** Requests a client-side jump; it cannot change waypoint access state. */
  onNavigate: (groupIndex: number) => void;
};

/**
 * Renders a full-height right-side index on every viewport size.
 *
 * The list scrolls to the current trail each time it opens. Locked trails stay
 * discoverable so learners can understand the curriculum's size, but native
 * disabled controls prevent them from being used as navigation destinations.
 */
export function TrailNavigator({
  groups,
  currentGroupIndex,
  onNavigate,
}: TrailNavigatorProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const currentEntryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    // The sheet portal must finish mounting before its internal list can move.
    // One animation frame keeps the current trail visible without animating the
    // entire page or stealing focus from the sheet's accessible focus handling.
    const frame = window.requestAnimationFrame(() => {
      currentEntryRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  function navigateToTrail(groupIndex: number): void {
    onNavigate(groupIndex);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            type="button"
            aria-label="Open Trail Navigator"
            title="Open Trail Navigator"
            variant="outline"
            size="icon-lg"
            className="size-12 rounded-full bg-card/95 shadow-lg backdrop-blur-sm"
          />
        }
      >
        <ListTreeIcon className="size-5" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-[85vw] max-w-[23.75rem] gap-0 overflow-hidden p-0 sm:max-w-[23.75rem]"
      >
        <SheetHeader className="shrink-0 border-b px-5 py-5 pr-14">
          <SheetTitle className="text-xl font-black">Trail Navigator</SheetTitle>
          <SheetDescription>
            Jump to any unlocked trail. Locked trails show what lies ahead.
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
          <div className="space-y-3">
            {groups.map((group) => {
              const theme = getMapTheme(group.index);
              const isCurrent = group.index === currentGroupIndex;
              const isLocked = group.waypoints.every(
                ({ status }) => status === WaypointStatus.LOCKED,
              );
              const completedCount = group.waypoints.filter(
                ({ status }) => status === WaypointStatus.COMPLETED,
              ).length;
              const isComplete = completedCount === group.waypoints.length;

              return (
                <button
                  key={group.index}
                  ref={isCurrent ? currentEntryRef : undefined}
                  type="button"
                  disabled={isLocked}
                  onClick={() => navigateToTrail(group.index)}
                  aria-current={isCurrent ? "location" : undefined}
                  className={cn(
                    "group grid min-h-24 w-full grid-cols-[5.25rem_1fr] overflow-hidden rounded-2xl border bg-card text-left shadow-sm outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50",
                    isCurrent && "border-amber-400 ring-2 ring-amber-300/35",
                    !isLocked && "hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
                    isLocked && "cursor-not-allowed opacity-55",
                  )}
                >
                  <span className="relative min-h-24 overflow-hidden bg-muted">
                    <Image
                      src={theme.imageSrc}
                      alt=""
                      fill
                      sizes="84px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 bg-linear-to-r from-transparent to-black/10"
                    />
                  </span>

                  <span className="flex min-w-0 flex-col justify-center gap-1.5 px-3 py-2.5">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-heading text-base font-black text-foreground">
                        Trail {group.index + 1}
                      </span>
                      {isCurrent ? (
                        <FlagIcon
                          className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300"
                          aria-label="Current trail"
                        />
                      ) : isLocked ? (
                        <LockKeyholeIcon
                          className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                          aria-label="Locked trail"
                        />
                      ) : isComplete ? (
                        <CheckIcon
                          className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-300"
                          aria-label="Completed trail"
                        />
                      ) : null}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Waypoints {group.startNumber}–{group.endNumber}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-emerald-500 transition-[width]"
                          style={{ width: `${(completedCount / group.waypoints.length) * 100}%` }}
                        />
                      </span>
                      <span className="text-[0.7rem] font-bold text-muted-foreground">
                        {completedCount}/{group.waypoints.length}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
