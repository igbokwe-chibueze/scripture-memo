"use client";

/**
 * Browser-only visual editor for aligning ten interactive waypoint centers to a
 * local PNG. The selected file never leaves the browser: it is represented by a
 * temporary object URL, not uploaded through a Server Action or stored anywhere.
 */

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ClipboardCopyIcon,
  CrosshairIcon,
  ImagePlusIcon,
  MoveIcon,
  RotateCcwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateMapPosition,
  DEFAULT_MAP_POSITIONS,
  formatMapPositions,
  normalizeMapPercentage,
  type MapPosition,
} from "@/features/map/lib/map-positioner";
import { cn } from "@/lib/utils";

const MAX_LOCAL_IMAGE_BYTES = 25 * 1024 * 1024;
const FALLBACK_IMAGE_DIMENSIONS = { width: 360, height: 1_340 } as const;

type ImagePreview = {
  url: string;
  name: string;
  width: number;
  height: number;
};

/** Creates a mutable copy so reset operations never mutate shared defaults. */
function createDefaultPositions(): MapPosition[] {
  return DEFAULT_MAP_POSITIONS.map((position) => ({ ...position }));
}

/**
 * Development-only drag editor used to prepare a PNG map-theme configuration.
 *
 * Inputs: one local PNG and ten percentage coordinates. Outputs: copyable
 * TypeScript only. There are deliberately no persistence calls or hidden side
 * effects, so refreshing the page safely resets the session and no application
 * or database data can be modified by this tool.
 */
export function MapPositioner(): React.ReactNode {
  const imageCanvasRef = useRef<HTMLDivElement>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [positions, setPositions] = useState<MapPosition[]>(createDefaultPositions);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const exportedPositions = useMemo(() => formatMapPositions(positions), [positions]);
  const previewUrl = imagePreview?.url;

  useEffect(() => {
    // Object URLs hold browser memory until explicitly released. React cleanup
    // revokes the previous preview when another file is selected or on unmount.
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function updatePosition(index: number, nextPosition: MapPosition): void {
    setPositions((currentPositions) =>
      currentPositions.map((position, positionIndex) =>
        positionIndex === index
          ? {
              x: normalizeMapPercentage(nextPosition.x),
              y: normalizeMapPercentage(nextPosition.y),
            }
          : position,
      ),
    );
  }

  function positionFromPointer(clientX: number, clientY: number): MapPosition | null {
    const canvas = imageCanvasRef.current;
    if (!canvas) return null;

    return calculateMapPosition(clientX, clientY, canvas.getBoundingClientRect());
  }

  function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // MIME type plus extension keeps the workflow intentionally PNG-specific.
    // The file is never parsed on the server, but early rejection avoids a
    // confusing preview and keeps exported instructions consistent.
    if (file.type !== "image/png" || !file.name.toLowerCase().endsWith(".png")) {
      toast.error("Choose a PNG image for the trail background.", { duration: Infinity });
      event.target.value = "";
      return;
    }

    // A generous local cap prevents an accidental enormous design export from
    // exhausting browser memory. It does not impose a production asset limit.
    if (file.size > MAX_LOCAL_IMAGE_BYTES) {
      toast.error("The PNG must be 25 MB or smaller for this preview tool.", {
        duration: Infinity,
      });
      event.target.value = "";
      return;
    }

    setImagePreview({
      url: URL.createObjectURL(file),
      name: file.name,
      ...FALLBACK_IMAGE_DIMENSIONS,
    });
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    // Ignore placeholder clicks so coordinates cannot change invisibly before a
    // real image establishes the design surface and aspect ratio.
    if (!imagePreview) return;

    const nextPosition = positionFromPointer(event.clientX, event.clientY);
    if (nextPosition) updatePosition(selectedIndex, nextPosition);
  }

  function handleMarkerPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    index: number,
  ): void {
    // Prevent the underlying canvas from processing the same pointer event and
    // capture subsequent moves even when the pointer leaves the round marker.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedIndex(index);

    const nextPosition = positionFromPointer(event.clientX, event.clientY);
    if (nextPosition) updatePosition(index, nextPosition);
  }

  function handleMarkerPointerMove(
    event: React.PointerEvent<HTMLButtonElement>,
    index: number,
  ): void {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const nextPosition = positionFromPointer(event.clientX, event.clientY);
    if (nextPosition) updatePosition(index, nextPosition);
  }

  function handleMarkerKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    const position = positions[index];
    if (!position) return;

    // Arrow keys provide precise accessible positioning. Normal movement is
    // 0.1%; Shift accelerates it to 1% for larger adjustments.
    const step = event.shiftKey ? 1 : 0.1;
    const movement: Partial<MapPosition> = {};

    if (event.key === "ArrowLeft") movement.x = position.x - step;
    if (event.key === "ArrowRight") movement.x = position.x + step;
    if (event.key === "ArrowUp") movement.y = position.y - step;
    if (event.key === "ArrowDown") movement.y = position.y + step;
    if (movement.x === undefined && movement.y === undefined) return;

    event.preventDefault();
    setSelectedIndex(index);
    updatePosition(index, { ...position, ...movement });
  }

  async function copyCoordinates(): Promise<void> {
    try {
      await navigator.clipboard.writeText(exportedPositions);
      toast.success("Waypoint coordinates copied.", { duration: 4_000 });
    } catch {
      // Clipboard permission can be unavailable outside a secure localhost
      // context. The visible read-only field remains a manual-copy fallback.
      toast.error("Clipboard access failed. Select and copy the coordinates manually.", {
        duration: Infinity,
      });
    }
  }

  const canvasDimensions = imagePreview ?? FALLBACK_IMAGE_DIMENSIONS;
  const selectedPosition = positions[selectedIndex];

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="space-y-4" aria-labelledby="positioner-canvas-heading">
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label htmlFor="map-positioner-file">Local trail PNG</Label>
            <Input
              id="map-positioner-file"
              type="file"
              accept="image/png,.png"
              onChange={handleImageSelection}
              className="max-w-md cursor-pointer"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {imagePreview ? (
              <>
                <p className="font-semibold text-foreground">{imagePreview.name}</p>
                <p>
                  {imagePreview.width} × {imagePreview.height}px
                </p>
              </>
            ) : (
              <p>Select a PNG to begin positioning.</p>
            )}
          </div>
        </div>

        <div>
          <h2 id="positioner-canvas-heading" className="sr-only">
            Trail image positioning canvas
          </h2>
          <div
            ref={imageCanvasRef}
            onPointerDown={handleCanvasPointerDown}
            className={cn(
              "relative mx-auto w-full max-w-[45rem] touch-none overflow-hidden rounded-[2rem] border-2 border-dashed bg-muted/35 shadow-xl",
              imagePreview ? "border-primary/30" : "border-border",
            )}
            style={{ aspectRatio: `${canvasDimensions.width} / ${canvasDimensions.height}` }}
          >
            {imagePreview ? (
              <Image
                src={imagePreview.url}
                alt=""
                fill
                unoptimized
                draggable={false}
                sizes="(max-width: 1280px) 100vw, 720px"
                className="pointer-events-none select-none object-fill"
                onLoad={(event) => {
                  // Natural dimensions define the exact canvas aspect ratio,
                  // preventing coordinate drift from stretching or cropping.
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (naturalWidth <= 0 || naturalHeight <= 0) return;
                  setImagePreview((currentPreview) =>
                    currentPreview
                      ? { ...currentPreview, width: naturalWidth, height: naturalHeight }
                      : null,
                  );
                }}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-8 text-center text-muted-foreground">
                <div>
                  <ImagePlusIcon className="mx-auto size-10" aria-hidden="true" />
                  <p className="mt-3 font-semibold text-foreground">No trail image selected</p>
                  <p className="mt-1 text-sm">The PNG remains on this device.</p>
                </div>
              </div>
            )}

            {imagePreview &&
              positions.map((position, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Waypoint ${index + 1} at ${position.x}% horizontal and ${position.y}% vertical`}
                  aria-pressed={selectedIndex === index}
                  onPointerDown={(event) => handleMarkerPointerDown(event, index)}
                  onPointerMove={(event) => handleMarkerPointerMove(event, index)}
                  onKeyDown={(event) => handleMarkerKeyDown(event, index)}
                  className={cn(
                    "absolute z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-full border-4 text-base font-black shadow-[0_5px_0_rgb(0_0_0/0.3)] outline-none transition focus-visible:ring-4 focus-visible:ring-ring/60 motion-reduce:transition-none",
                    selectedIndex === index
                      ? "scale-110 border-amber-200 bg-amber-500 text-amber-950"
                      : "border-emerald-200 bg-emerald-600 text-white hover:scale-105",
                  )}
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                >
                  {index + 1}
                </button>
              ))}
          </div>
        </div>
      </section>

      <aside className="space-y-5 xl:sticky xl:top-4" aria-label="Waypoint position controls">
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <MoveIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold">Position waypoint {selectedIndex + 1}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Drag its marker, click the image, or use arrow keys. Hold Shift for larger
                keyboard steps.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="map-position-x">Horizontal X (%)</Label>
              <Input
                id="map-position-x"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={selectedPosition?.x ?? 0}
                onChange={(event) =>
                  selectedPosition &&
                  updatePosition(selectedIndex, {
                    ...selectedPosition,
                    x: Number(event.target.value),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="map-position-y">Vertical Y (%)</Label>
              <Input
                id="map-position-y"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={selectedPosition?.y ?? 0}
                onChange={(event) =>
                  selectedPosition &&
                  updatePosition(selectedIndex, {
                    ...selectedPosition,
                    y: Number(event.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2" aria-label="Choose waypoint marker">
            {positions.map((position, index) => (
              <button
                key={index}
                type="button"
                aria-pressed={selectedIndex === index}
                aria-label={`Edit waypoint ${index + 1}`}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "grid min-h-11 place-items-center rounded-xl border text-sm font-bold outline-none transition focus-visible:ring-3 focus-visible:ring-ring/50",
                  selectedIndex === index
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:border-primary/50",
                )}
                title={`X ${position.x}%, Y ${position.y}%`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => setPositions(createDefaultPositions())}
          >
            <RotateCcwIcon aria-hidden="true" />
            Reset all positions
          </Button>
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CrosshairIcon className="size-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-lg font-bold">Export coordinates</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Copy this array into the relevant map theme after reviewing the values.
          </p>
          <Label htmlFor="map-position-output" className="sr-only">
            Generated waypoint coordinates
          </Label>
          <Textarea
            id="map-position-output"
            readOnly
            value={exportedPositions}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-4 min-h-64 resize-y font-mono text-xs"
          />
          <Button type="button" className="mt-3 w-full" onClick={copyCoordinates}>
            <ClipboardCopyIcon aria-hidden="true" />
            Copy coordinates
          </Button>
        </section>
      </aside>
    </div>
  );
}
