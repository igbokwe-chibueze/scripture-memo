"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Grid2X2Icon, MapIcon } from "lucide-react";
import { toast } from "sonner";
import { GridGameMap } from "@/features/map/components/grid-game-map";
import { WindingTrailMap } from "@/features/map/components/winding-trail-map";
import { resolveMapVariant } from "@/features/map/lib/map-variant";
import type { MapVariant, MapWaypoint } from "@/features/map/types/map.types";
import { WaypointStatus } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

const MAP_VARIANT_STORAGE_KEY = "scripture-memo:map-variant";
const MAP_VARIANT_CHANGE_EVENT = "scripture-memo:map-variant-change";

const mapVariants: Array<{
  value: MapVariant;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}> = [
  { value: "a", label: "Map A", description: "Trail", icon: MapIcon },
  { value: "b", label: "Map B", description: "Grid", icon: Grid2X2Icon },
];

/** Reads the browser-owned comparison choice without making it server state. */
function getMapVariantSnapshot(): MapVariant {
  const queryVariant = new URLSearchParams(window.location.search).get("variant");
  let storedVariant: string | null = null;

  try {
    storedVariant = window.localStorage.getItem(MAP_VARIANT_STORAGE_KEY);
  } catch {
    // Browser privacy settings can disable storage. URL assignment and the
    // stable Map A fallback still provide a complete experience.
  }

  return resolveMapVariant(queryVariant, storedVariant);
}

/** Subscribes React to browser history and in-page variant switch changes. */
function subscribeToMapVariant(onStoreChange: () => void): () => void {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(MAP_VARIANT_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(MAP_VARIANT_CHANGE_EVENT, onStoreChange);
  };
}

/**
 * Owns the shared map behavior while two isolated presentations compete fairly.
 * Both variants receive identical progress data and waypoint navigation rules.
 */
export function GameMap({ waypoints }: { waypoints: MapWaypoint[] }): React.ReactNode {
  const router = useRouter();
  const variant = useSyncExternalStore(
    subscribeToMapVariant,
    getMapVariantSnapshot,
    () => "a",
  );

  function selectVariant(nextVariant: MapVariant): void {
    try {
      window.localStorage.setItem(MAP_VARIANT_STORAGE_KEY, nextVariant);
    } catch {
      // Persisting preference is a convenience, not a gameplay requirement.
    }

    // Next.js 16 integrates native history changes with its router. Replacing
    // only this query value avoids a server refresh and preserves other params.
    const url = new URL(window.location.href);
    url.searchParams.set("variant", nextVariant);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new Event(MAP_VARIANT_CHANGE_EVENT));
  }

  function selectWaypoint(waypoint: MapWaypoint): void {
    if (waypoint.status === WaypointStatus.LOCKED) {
      const previousNumber = waypoints
        .filter(({ number }) => number < waypoint.number)
        .at(-1)?.number;
      toast.info(
        previousNumber
          ? `Complete Waypoint ${previousNumber} to unlock this.`
          : "Complete the previous waypoint to unlock this.",
        { duration: 4_000 },
      );
      return;
    }

    router.push(`/game/waypoints/${waypoint.id}`);
  }

  return (
    <section aria-label="Game map comparison" className="space-y-5">
      <div className="mx-auto max-w-md rounded-2xl border bg-card/85 p-1.5 shadow-lg shadow-foreground/5 backdrop-blur-sm">
        <div role="group" aria-label="Choose a game map" className="grid grid-cols-2 gap-1.5">
          {mapVariants.map((option) => {
            const Icon = option.icon;
            const isSelected = variant === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => selectVariant(option.value)}
                className={cn(
                  "flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-left outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden={true} />
                <span>
                  <span className="block text-sm font-bold leading-tight">{option.label}</span>
                  <span className="block text-[0.65rem] leading-tight opacity-75">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {variant === "a" ? (
        <WindingTrailMap waypoints={waypoints} onSelectWaypoint={selectWaypoint} />
      ) : (
        <GridGameMap waypoints={waypoints} onSelectWaypoint={selectWaypoint} />
      )}
    </section>
  );
}
