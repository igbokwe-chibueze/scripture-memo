"use client";

import Image from "next/image";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const WAYPOINT_ASSET_PATH = "/images/map/waypoint-buttons";

type StatusArtwork = {
  icon: string;
  iconWidth: string;
  iconTop: string;
  iconAspectRatio: string;
  base: "button-base-blue.png" | "button-base-locked.png";
};

/**
 * Keeps the supplied sprite choices tied to the existing server-owned status.
 * COOLDOWN still represents an opened, progressing waypoint: its day timer is
 * shown after selection, so it keeps the blue base and learning-book icon.
 */
const STATUS_ARTWORK: Record<WaypointStatus, StatusArtwork> = {
  LOCKED: {
    base: "button-base-locked.png",
    icon: "icon-lock.png",
    iconWidth: "23%",
    iconTop: "18%",
    iconAspectRatio: "1371 / 1148",
  },
  UNLOCKED: {
    base: "button-base-blue.png",
    icon: "icon-play.png",
    iconWidth: "28%",
    iconTop: "18%",
    iconAspectRatio: "1407 / 1118",
  },
  IN_PROGRESS: {
    base: "button-base-blue.png",
    icon: "icon-book.png",
    iconWidth: "32%",
    iconTop: "18%",
    iconAspectRatio: "1568 / 1003",
  },
  COOLDOWN: {
    base: "button-base-blue.png",
    icon: "icon-book.png",
    iconWidth: "32%",
    iconTop: "18%",
    iconAspectRatio: "1568 / 1003",
  },
  COMPLETED: {
    base: "button-base-blue.png",
    icon: "icon-complete.png",
    iconWidth: "29%",
    iconTop: "18%",
    iconAspectRatio: "1536 / 1024",
  },
};

/**
 * Dedicated tactile control for the illustrated winding trail.
 *
 * This component intentionally remains separate from the shared application
 * Button primitive. The supplied transparent sprites form a compact oval puck,
 * while this native button retains the original circular hit area, responsive
 * footprint, keyboard focus, and press behavior over the illustrated trail.
 */
export function TrailWaypointButton({
  status,
  isCurrent,
  number,
  flameCount,
  ariaLabel,
  onClick,
}: {
  status: WaypointStatus;
  isCurrent: boolean;
  number: number;
  flameCount: number;
  ariaLabel: string;
  onClick: () => void;
}): React.ReactNode {
  const artwork = STATUS_ARTWORK[status];
  const safeFlameCount = Math.max(0, Math.min(3, flameCount));

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
          "group relative grid size-full place-items-center rounded-full bg-transparent outline-none transition-transform duration-150 hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-white/80 active:scale-[0.97] motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100",
          isCurrent && "ring-3 ring-amber-300/75 sm:ring-4",
        )}
      >
        {/*
          The original base canvas is 1371×1148, an oval rather than a circle.
          Keeping its natural aspect ratio inside the existing square target
          preserves the art while the complete layer stack remains within the
          map's existing 64/72px mobile and 80/96px larger-screen footprint.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 w-full"
          style={{ aspectRatio: "1371 / 1148" }}
        >
          <Image
            src={`${WAYPOINT_ASSET_PATH}/${artwork.base}`}
            alt=""
            fill
            sizes="96px"
            className="object-contain"
          />
        </span>

        {/*
          The icon PNG canvases have different transparent margins. Their
          per-status canvas widths compensate for those margins so the visible
          marks share a similar scale and align above the live number.
        */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            top: artwork.iconTop,
            width: artwork.iconWidth,
            aspectRatio: artwork.iconAspectRatio,
          }}
        >
          <Image
            src={`${WAYPOINT_ASSET_PATH}/${artwork.icon}`}
            alt=""
            fill
            sizes="34px"
            className="object-contain"
          />
        </span>

        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-[36%] left-0 z-10 w-full text-center leading-none text-white",
            "font-heading font-bold [text-shadow:0_2px_2px_rgb(4_49_130/0.8)]",
            isCurrent
              ? "text-[1.375rem] sm:text-[1.625rem]"
              : "text-xl sm:text-2xl",
          )}
        >
          {number}
        </span>

        {/*
          The flame assets use near-square canvases with different transparent
          margins. Each keeps its source ratio and sits just over the lower rim.
        */}
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 z-20"
            style={{
              left: `${12 + index * 26}%`,
              width: "24%",
              aspectRatio: "1268 / 1240",
            }}
          >
            <Image
              src={`${WAYPOINT_ASSET_PATH}/${index < safeFlameCount ? "flame-filled.png" : "flame-empty.png"}`}
              alt=""
              fill
              sizes="24px"
              className="object-contain"
            />
          </span>
        ))}
      </button>
    </div>
  );
}
