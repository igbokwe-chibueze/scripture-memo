"use client";

import type { ReactNode } from "react";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const faceStyles: Record<WaypointStatus, string> = {
  LOCKED:
    "border-zinc-300 bg-linear-to-b from-zinc-100 to-zinc-300 text-zinc-500 dark:border-zinc-500 dark:from-zinc-600 dark:to-zinc-800 dark:text-zinc-200",
  UNLOCKED:
    "border-emerald-200 bg-linear-to-b from-emerald-300 to-emerald-600 text-white hover:from-emerald-200 hover:to-emerald-500",
  IN_PROGRESS:
    "border-emerald-200 bg-linear-to-b from-emerald-300 to-emerald-600 text-white hover:from-emerald-200 hover:to-emerald-500",
  COOLDOWN:
    "border-violet-200 bg-linear-to-b from-violet-300 to-violet-600 text-white hover:from-violet-200 hover:to-violet-500",
  COMPLETED:
    "border-sky-200 bg-linear-to-b from-sky-300 to-sky-600 text-white hover:from-sky-200 hover:to-sky-500",
};

/**
 * Dedicated tactile control for the illustrated winding trail.
 *
 * This component intentionally does not consume the shared application Button
 * primitive. Its gradient face and scale response remain independent of global
 * button styling, while avoiding offset shadows or pedestal layers that obscure
 * the illustrated trail beneath it.
 */
export function TrailWaypointButton({
  status,
  isCurrent,
  ariaLabel,
  onClick,
  children,
}: {
  status: WaypointStatus;
  isCurrent: boolean;
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}): React.ReactNode {
  return (
    <div
      className={cn(
        "relative size-16 sm:size-20",
        isCurrent && "size-18 sm:size-24",
      )}
    >
      <button
        type="button"
        aria-disabled={status === WaypointStatus.LOCKED}
        aria-label={ariaLabel}
        onClick={onClick}
        className={cn(
          "group relative grid size-full place-items-center rounded-full border-[3px] text-base font-black outline-none transition-[transform,background-image] duration-150 hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-white/80 active:scale-[0.97] sm:border-4 sm:text-xl motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
          faceStyles[status],
          isCurrent && "ring-3 ring-amber-300/75 sm:ring-4",
        )}
      >
        {children}
        <span
          aria-hidden="true"
          className="absolute inset-x-[18%] top-[10%] h-[16%] rounded-full bg-white/35"
        />
      </button>
    </div>
  );
}
