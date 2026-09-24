"use client";

/**
 * Administrator controls for each currently published Map A trail illustration.
 *
 * Artwork is selected from a server-provided, built-in catalogue. Selecting the
 * default option deletes the durable assignment; the map then resolves the
 * original repeating catalogue order without changing curriculum state.
 */

import Image from "next/image";
import { useTransition } from "react";
import { ImageIcon, LoaderCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { setTrailArtworkAction } from "@/features/map/actions/set-trail-artwork.action";
import { isMapThemeId } from "@/features/map/data/map-themes";
import type {
  MapArtworkOption,
  MapTrailArtworkRow,
} from "@/features/map/types/map.types";

/** Renders responsive, immediate-save assignment cards for published trails. */
export function MapTrailArtworkManager({
  rows,
  options,
}: {
  rows: MapTrailArtworkRow[];
  options: MapArtworkOption[];
}): React.ReactNode {
  const [isPending, startTransition] = useTransition();

  function changeArtwork(trailNumber: number, rawThemeId: string): void {
    const themeId = rawThemeId === "default"
      ? null
      : isMapThemeId(rawThemeId)
        ? rawThemeId
        : null;

    if (rawThemeId !== "default" && themeId === null) {
      toast.error("Choose one of the available map images.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await setTrailArtworkAction({ trailNumber, themeId });
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
      } catch {
        toast.error("Trail artwork could not be updated. Please try again.");
      }
    });
  }

  return (
    <section aria-label="Published Map A trails" className="space-y-4">
      {rows.map((row) => {
        const selectId = `trail-artwork-${row.trailNumber}`;
        const assignedName = options.find(
          ({ id }) => id === row.assignedThemeId,
        )?.name;

        return (
          <article
            key={row.trailNumber}
            className="grid gap-4 rounded-3xl border bg-card p-3 shadow-sm sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center sm:p-4"
          >
            <div className="relative aspect-[9/10] w-full overflow-hidden rounded-2xl border bg-muted sm:aspect-[3/4] sm:w-28">
              <Image
                src={row.effectiveArtwork.imageSrc}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 112px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 space-y-3">
              <div>
                <h2 className="font-heading text-lg font-black">
                  Trail {row.trailNumber}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Waypoints {row.firstWaypointNumber}–{row.lastWaypointNumber}
                  {" · "}
                  {row.waypointCount} in this trail
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={selectId}
                  className="text-sm font-bold text-foreground"
                >
                  Map artwork
                </label>
                <select
                  id={selectId}
                  value={row.assignedThemeId ?? "default"}
                  disabled={isPending}
                  onChange={(event) =>
                    changeArtwork(row.trailNumber, event.currentTarget.value)
                  }
                  className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-wait disabled:opacity-60"
                >
                  <option value="default">Original artwork sequence</option>
                  {options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </div>

              <p
                className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground"
                aria-live="polite"
              >
                {isPending ? (
                  <>
                    <LoaderCircleIcon
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                    Saving artwork…
                  </>
                ) : row.assignedThemeId ? (
                  <>
                    <ImageIcon className="size-3.5" aria-hidden="true" />
                    Assigned: {assignedName ?? row.effectiveArtwork.name}
                  </>
                ) : (
                  <>
                    <ImageIcon className="size-3.5" aria-hidden="true" />
                    Sequence default: {row.effectiveArtwork.name}
                  </>
                )}
              </p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
