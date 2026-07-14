"use client";

/**
 * Browser-only responsive map alignment editor.
 *
 * Designers choose a local PNG, exact design dimensions, waypoint count,
 * responsive preview widths, and real button diameters. Mobile and large
 * coordinates are edited independently and exported together. The selected file
 * remains in browser memory through an object URL; there are no uploads, Server
 * Actions, filesystem writes, Prisma calls, or database side effects.
 */

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangleIcon,
  ClipboardCopyIcon,
  CrosshairIcon,
  ImageIcon,
  ImagePlusIcon,
  InfoIcon,
  Maximize2Icon,
  MonitorIcon,
  MoveIcon,
  RotateCcwIcon,
  ScalingIcon,
  SlidersHorizontalIcon,
  SmartphoneIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  calculateMapPosition,
  calculateMapPreviewScale,
  createDefaultMapPositions,
  formatMapPositionerConfiguration,
  isWaypointButtonClipped,
  normalizeMapPercentage,
  resizeMapPositions,
  type MapPosition,
  type MapPositionerLayout,
} from "@/features/map/lib/map-positioner";
import { cn } from "@/lib/utils";

const MAX_LOCAL_IMAGE_BYTES = 25 * 1024 * 1024;
const DEFAULT_IMAGE_DIMENSIONS = { width: 941, height: 1672 } as const;
const DEFAULT_WAYPOINT_COUNT = 5;

type LayoutMode = "mobile" | "large";
type PreviewScaleMode = "fit" | "actual";

type ImagePreview = {
  url: string;
  name: string;
  naturalWidth: number;
  naturalHeight: number;
};

type RenderedCanvasSize = {
  width: number;
  height: number;
};

/** Creates independent coordinate objects so one responsive layout cannot mutate the other. */
function createInitialLayout(
  previewWidth: number,
  buttonSize: number,
  currentButtonSize: number,
): MapPositionerLayout {
  return {
    previewWidth,
    buttonSize,
    currentButtonSize,
    positions: createDefaultMapPositions(DEFAULT_WAYPOINT_COUNT),
  };
}

/** Restricts numeric design settings to finite values within an intentional range. */
function normalizeInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

/**
 * Development-only editor used to prepare responsive Map A theme data.
 *
 * The active mode controls which coordinate array is changed. Shared image and
 * waypoint settings remain visible in the exported object so another developer
 * can reproduce the preview rather than guessing its scale later.
 */
export function MapPositioner(): React.ReactNode {
  const imageCanvasRef = useRef<HTMLDivElement>(null);
  const previewViewportRef = useRef<HTMLDivElement>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  }>({ ...DEFAULT_IMAGE_DIMENSIONS });
  const [waypointCount, setWaypointCount] = useState(DEFAULT_WAYPOINT_COUNT);
  const [breakpoint, setBreakpoint] = useState(640);
  const [currentWaypoint, setCurrentWaypoint] = useState(1);
  const [mode, setMode] = useState<LayoutMode>("mobile");
  const [previewScaleMode, setPreviewScaleMode] =
    useState<PreviewScaleMode>("fit");
  const [mobileLayout, setMobileLayout] = useState<MapPositionerLayout>(() =>
    createInitialLayout(375, 64, 72),
  );
  const [largeLayout, setLargeLayout] = useState<MapPositionerLayout>(() =>
    createInitialLayout(480, 80, 96),
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [renderedCanvasSize, setRenderedCanvasSize] = useState<RenderedCanvasSize>({
    width: 0,
    height: 0,
  });
  const [previewWorkspace, setPreviewWorkspace] = useState({
    width: 0,
    viewportHeight: 0,
  });

  const activeLayout = mode === "mobile" ? mobileLayout : largeLayout;
  const activePositions = activeLayout.positions;
  const selectedPosition = activePositions[selectedIndex];
  const previewUrl = imagePreview?.url;
  const requestedCanvasHeight =
    activeLayout.previewWidth * (imageDimensions.height / imageDimensions.width);
  // The toolbar occupies roughly 5rem. Keeping an additional 2rem breathing
  // room ensures Fit mode does not hide the bottom edge behind browser chrome.
  const availableFitHeight = Math.max(280, previewWorkspace.viewportHeight - 112);
  const fitScale = calculateMapPreviewScale(
    activeLayout.previewWidth,
    requestedCanvasHeight,
    previewWorkspace.width || activeLayout.previewWidth,
    availableFitHeight,
  );
  const requestedPreviewScale = previewScaleMode === "fit" ? fitScale : 1;
  const previewCanvasWidth = activeLayout.previewWidth * requestedPreviewScale;
  const renderedScale =
    renderedCanvasSize.width > 0
      ? renderedCanvasSize.width / activeLayout.previewWidth
      : requestedPreviewScale;

  const exportedConfiguration = useMemo(
    () =>
      formatMapPositionerConfiguration({
        image: imageDimensions,
        waypointCount,
        breakpoint,
        currentWaypoint,
        mobile: mobileLayout,
        large: largeLayout,
      }),
    [
      breakpoint,
      currentWaypoint,
      imageDimensions,
      largeLayout,
      mobileLayout,
      waypointCount,
    ],
  );

  const clippedIndexes = useMemo(() => {
    const { width, height } = renderedCanvasSize;
    if (width <= 0 || height <= 0) return [];

    return activePositions.flatMap((position, index) => {
      const configuredButtonSize =
        index === currentWaypoint - 1
          ? activeLayout.currentButtonSize
          : activeLayout.buttonSize;
      return isWaypointButtonClipped(
        position,
        configuredButtonSize * renderedScale,
        width,
        height,
      )
        ? [index]
        : [];
    });
  }, [
    activeLayout,
    activePositions,
    currentWaypoint,
    renderedCanvasSize,
    renderedScale,
  ]);

  useEffect(() => {
    // Object URLs retain browser memory until revoked. This cleanup releases the
    // previous PNG when a new one is chosen and releases the final URL on exit.
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const canvas = imageCanvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;

    // The preview may be narrower than its requested width on a small browser.
    // Measuring the rendered box makes clipping warnings reflect what is truly
    // visible instead of the unconstrained design setting.
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setRenderedCanvasSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = previewViewportRef.current;
    if (!viewport || typeof ResizeObserver === "undefined") return;

    const updateWorkspace = (): void => {
      setPreviewWorkspace({
        width: viewport.clientWidth,
        viewportHeight: window.innerHeight,
      });
    };
    const observer = new ResizeObserver(updateWorkspace);
    observer.observe(viewport);
    window.addEventListener("resize", updateWorkspace);
    updateWorkspace();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWorkspace);
    };
  }, []);

  function setActiveLayout(
    updater: (currentLayout: MapPositionerLayout) => MapPositionerLayout,
  ): void {
    if (mode === "mobile") setMobileLayout(updater);
    else setLargeLayout(updater);
  }

  function updatePosition(index: number, nextPosition: MapPosition): void {
    setActiveLayout((currentLayout) => ({
      ...currentLayout,
      positions: currentLayout.positions.map((position, positionIndex) =>
        positionIndex === index
          ? {
              x: normalizeMapPercentage(nextPosition.x),
              y: normalizeMapPercentage(nextPosition.y),
            }
          : position,
      ),
    }));
  }

  function positionFromPointer(clientX: number, clientY: number): MapPosition | null {
    const canvas = imageCanvasRef.current;
    if (!canvas) return null;
    return calculateMapPosition(clientX, clientY, canvas.getBoundingClientRect());
  }

  function handleWaypointCountChange(rawCount: number): void {
    const nextCount = normalizeInteger(rawCount, 1, 20);
    setWaypointCount(nextCount);
    setMobileLayout((layout) => ({
      ...layout,
      positions: resizeMapPositions(layout.positions, nextCount),
    }));
    setLargeLayout((layout) => ({
      ...layout,
      positions: resizeMapPositions(layout.positions, nextCount),
    }));
    setSelectedIndex((index) => Math.min(index, nextCount - 1));
    setCurrentWaypoint((number) => Math.min(number, nextCount));
  }

  function handleImageSelection(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/png" || !file.name.toLowerCase().endsWith(".png")) {
      toast.error("Choose a PNG image for the trail background.", { duration: Infinity });
      event.target.value = "";
      return;
    }
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
      naturalWidth: 0,
      naturalHeight: 0,
    });
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    if (!imagePreview) return;
    const nextPosition = positionFromPointer(event.clientX, event.clientY);
    if (nextPosition) updatePosition(selectedIndex, nextPosition);
  }

  function handleMarkerPointerDown(
    event: React.PointerEvent<HTMLButtonElement>,
    index: number,
  ): void {
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
    const position = activePositions[index];
    if (!position) return;

    // Arrow keys support precise accessible editing; Shift changes 0.1% steps
    // to 1% for faster movement across a long portrait image.
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

  function resetPositions(): void {
    const defaults = createDefaultMapPositions(waypointCount);
    setMobileLayout((layout) => ({
      ...layout,
      positions: defaults.map((position) => ({ ...position })),
    }));
    setLargeLayout((layout) => ({
      ...layout,
      positions: defaults.map((position) => ({ ...position })),
    }));
    setSelectedIndex(0);
  }

  async function copyConfiguration(): Promise<void> {
    try {
      await navigator.clipboard.writeText(exportedConfiguration);
      toast.success("Responsive map configuration copied.", { duration: 4_000 });
    } catch {
      toast.error("Clipboard access failed. Copy the visible configuration manually.", {
        duration: Infinity,
      });
    }
  }

  /**
   * Couples each compact field label with keyboard-focusable explanatory help.
   * The 44px trigger preserves the application's minimum touch target, while the
   * visible icon stays small enough not to compete with the form control.
   */
  function renderFieldLabel(
    htmlFor: string,
    label: string,
    explanation: string,
  ): React.ReactNode {
    return (
      <div className="flex min-h-11 items-center justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={`About ${label}`}
              />
            }
          >
            <InfoIcon className="size-3.5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-64 text-pretty">
            {explanation}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  /**
   * Produces the same controls for the desktop inspector and mobile sheet.
   * Prefixing every form ID keeps labels unambiguous if the sheet is mounted
   * while the CSS-hidden desktop inspector still exists in the document.
   */
  function renderControlPanels(idPrefix: "desktop" | "sheet"): React.ReactNode {
    const fieldId = (name: string): string => `${idPrefix}-${name}`;

    return (
      <div className="space-y-5">
        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <MoveIcon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-bold">Preview settings</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These values determine the real CSS size used by the canvas.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              {renderFieldLabel(
                fieldId("waypoint-count"),
                "Waypoints per image",
                "Sets how many waypoint markers and coordinate slots this single map image contains. Map A currently uses five.",
              )}
              <Input
                id={fieldId("waypoint-count")}
                type="number"
                min={1}
                max={20}
                value={waypointCount}
                onChange={(event) => handleWaypointCountChange(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              {renderFieldLabel(
                fieldId("current-waypoint"),
                "Current-state waypoint",
                "Chooses which marker previews the player's active state and larger current-button diameter. It does not choose which marker you are editing.",
              )}
              <Input
                id={fieldId("current-waypoint")}
                type="number"
                min={1}
                max={waypointCount}
                value={currentWaypoint}
                onChange={(event) =>
                  setCurrentWaypoint(
                    normalizeInteger(Number(event.target.value), 1, waypointCount),
                  )
                }
              />
            </div>
            <div className="space-y-2">
              {renderFieldLabel(
                fieldId("preview-width"),
                `${mode} preview width`,
                `Sets the simulated CSS width of the map in the ${mode} layout. Fit mode may scale this visual preview while preserving the exported value.`,
              )}
              <Input
                id={fieldId("preview-width")}
                type="number"
                min={240}
                max={1600}
                value={activeLayout.previewWidth}
                onChange={(event) =>
                  setActiveLayout((layout) => ({
                    ...layout,
                    previewWidth: normalizeInteger(Number(event.target.value), 240, 1600),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              {renderFieldLabel(
                fieldId("breakpoint"),
                "Large breakpoint",
                "Sets the viewport width where the application changes from mobile coordinates and sizes to the independently configured large layout.",
              )}
              <Input
                id={fieldId("breakpoint")}
                type="number"
                min={320}
                max={1600}
                value={breakpoint}
                onChange={(event) =>
                  setBreakpoint(normalizeInteger(Number(event.target.value), 320, 1600))
                }
              />
            </div>
            <div className="space-y-2">
              {renderFieldLabel(
                fieldId("button-size"),
                "Normal button (px)",
                "Sets the CSS-pixel diameter of every waypoint button that is not displaying the player's current active state.",
              )}
              <Input
                id={fieldId("button-size")}
                type="number"
                min={44}
                max={200}
                value={activeLayout.buttonSize}
                onChange={(event) =>
                  setActiveLayout((layout) => ({
                    ...layout,
                    buttonSize: normalizeInteger(Number(event.target.value), 44, 200),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              {renderFieldLabel(
                fieldId("current-size"),
                "Current button (px)",
                "Sets the CSS-pixel diameter of the Current-state waypoint. It can be larger than normal buttons to emphasize where the player continues.",
              )}
              <Input
                id={fieldId("current-size")}
                type="number"
                min={44}
                max={220}
                value={activeLayout.currentButtonSize}
                onChange={(event) =>
                  setActiveLayout((layout) => ({
                    ...layout,
                    currentButtonSize: normalizeInteger(
                      Number(event.target.value),
                      44,
                      220,
                    ),
                  }))
                }
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <h2 className="font-heading text-lg font-bold">
            Position {mode} waypoint {selectedIndex + 1}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Drag, click, edit percentages, or use arrow keys. Hold Shift for 1% steps.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={fieldId("position-x")}>Horizontal X (%)</Label>
              <Input
                id={fieldId("position-x")}
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
              <Label htmlFor={fieldId("position-y")}>Vertical Y (%)</Label>
              <Input
                id={fieldId("position-y")}
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
            {activePositions.map((position, index) => (
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
                    : clippedIndexes.includes(index)
                      ? "border-destructive/60 bg-destructive/10 text-destructive"
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
            onClick={resetPositions}
          >
            <RotateCcwIcon aria-hidden="true" />
            Reset both layouts
          </Button>
        </section>

        <section className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CrosshairIcon className="size-5 text-primary" aria-hidden="true" />
            <h2 className="font-heading text-lg font-bold">Export configuration</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Includes dimensions, sizes, breakpoint, count, and both coordinate sets.
          </p>
          <Label htmlFor={fieldId("position-output")} className="sr-only">
            Generated responsive map configuration
          </Label>
          <Textarea
            id={fieldId("position-output")}
            readOnly
            value={exportedConfiguration}
            onFocus={(event) => event.currentTarget.select()}
            className="mt-4 min-h-80 resize-y font-mono text-xs"
          />
          <Button type="button" className="mt-3 w-full" onClick={copyConfiguration}>
            <ClipboardCopyIcon aria-hidden="true" />
            Copy full configuration
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <TooltipProvider>
        <div className="sticky top-2 z-40 flex min-h-14 items-center gap-1.5 overflow-x-auto rounded-2xl border bg-background/95 p-1.5 shadow-lg backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="hidden min-w-40 px-2 lg:block">
            <p className="font-heading text-sm font-black">Trail positioner</p>
            <p className="truncate text-[0.65rem] text-muted-foreground">
              {imagePreview?.name ?? "No image selected"}
            </p>
          </div>

          <Dialog>
            <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
              <ImageIcon aria-hidden="true" />
              <span className="hidden sm:inline">Image</span>
            </DialogTrigger>
            <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Image settings</DialogTitle>
                <DialogDescription>
                  Select a browser-local PNG and confirm its exact design dimensions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="map-positioner-file">Local trail PNG</Label>
                  <Input
                    id="map-positioner-file"
                    type="file"
                    accept="image/png,.png"
                    onChange={handleImageSelection}
                    className="cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="map-image-width">Design width (px)</Label>
                  <Input
                    id="map-image-width"
                    type="number"
                    min={1}
                    max={10000}
                    value={imageDimensions.width}
                    onChange={(event) =>
                      setImageDimensions((dimensions) => ({
                        ...dimensions,
                        width: normalizeInteger(Number(event.target.value), 1, 10000),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="map-image-height">Design height (px)</Label>
                  <Input
                    id="map-image-height"
                    type="number"
                    min={1}
                    max={20000}
                    value={imageDimensions.height}
                    onChange={(event) =>
                      setImageDimensions((dimensions) => ({
                        ...dimensions,
                        height: normalizeInteger(Number(event.target.value), 1, 20000),
                      }))
                    }
                  />
                </div>
                {imagePreview && (
                  <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground sm:col-span-2">
                    <span className="font-semibold text-foreground">{imagePreview.name}</span>
                    <br />
                    Natural size: {imagePreview.naturalWidth || "..."} x{" "}
                    {imagePreview.naturalHeight || "..."}px
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex rounded-xl border bg-muted/35 p-0.5" aria-label="Responsive layout mode">
            {(["mobile", "large"] as const).map((layoutMode) => {
              const Icon = layoutMode === "mobile" ? SmartphoneIcon : MonitorIcon;
              return (
                <Tooltip key={layoutMode}>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant={mode === layoutMode ? "default" : "ghost"}
                        size="icon-sm"
                        aria-pressed={mode === layoutMode}
                        onClick={() => setMode(layoutMode)}
                      />
                    }
                  >
                    <Icon aria-hidden="true" />
                    <span className="sr-only">Edit {layoutMode} layout</span>
                  </TooltipTrigger>
                  <TooltipContent>Edit {layoutMode} layout</TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <div className="flex rounded-xl border bg-muted/35 p-0.5" aria-label="Preview scale mode">
            {(["fit", "actual"] as const).map((scaleMode) => {
              const Icon = scaleMode === "fit" ? ScalingIcon : Maximize2Icon;
              return (
                <Tooltip key={scaleMode}>
                  <TooltipTrigger
                    render={
                      <Button
                        type="button"
                        variant={previewScaleMode === scaleMode ? "default" : "ghost"}
                        size="icon-sm"
                        aria-pressed={previewScaleMode === scaleMode}
                        onClick={() => setPreviewScaleMode(scaleMode)}
                      />
                    }
                  >
                    <Icon aria-hidden="true" />
                    <span className="sr-only">{scaleMode} preview</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {scaleMode === "fit"
                      ? "Fit image and buttons to the workspace"
                      : "Show the configured CSS size"}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <Label htmlFor="toolbar-waypoint" className="sr-only">
            Edit waypoint
          </Label>
          <select
            id="toolbar-waypoint"
            value={selectedIndex}
            onChange={(event) => setSelectedIndex(Number(event.target.value))}
            className="h-9 min-w-28 rounded-lg border bg-background px-2 text-xs font-bold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {activePositions.map((_, index) => (
              <option key={index} value={index}>
                Edit waypoint {index + 1}
              </option>
            ))}
          </select>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label="About Edit waypoint"
                />
              }
            >
              <InfoIcon className="size-3.5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-pretty">
              Chooses which marker you are moving or editing. It does not change which
              marker displays the larger Current-state waypoint treatment.
            </TooltipContent>
          </Tooltip>

          <Sheet>
            <SheetTrigger
              render={
                <Button type="button" variant="outline" size="icon-sm" className="xl:hidden" />
              }
            >
              <SlidersHorizontalIcon aria-hidden="true" />
              <span className="sr-only">Open positioner controls</span>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(92vw,24rem)] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Positioner controls</SheetTitle>
                <SheetDescription>
                  Configure sizes, edit the selected waypoint, and export both layouts.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">{renderControlPanels("sheet")}</div>
            </SheetContent>
          </Sheet>

          <span className="ml-auto hidden whitespace-nowrap px-2 text-xs font-semibold text-muted-foreground md:inline">
            {mode} / {previewScaleMode} / {Math.round(renderedScale * 100)}%
          </span>
        </div>
      </TooltipProvider>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="space-y-3" aria-labelledby="positioner-canvas-heading">

        {clippedIndexes.length > 0 && (
          <div className="flex gap-3 rounded-2xl border border-destructive/35 bg-destructive/8 p-4 text-sm text-destructive">
            <AlertTriangleIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <p>
              {clippedIndexes.length === 1 ? "Waypoint" : "Waypoints"}{" "}
              {clippedIndexes.map((index) => index + 1).join(", ")} would be clipped at
              this rendered size. Move {clippedIndexes.length === 1 ? "it" : "them"} farther
              inside the image.
            </p>
          </div>
        )}

        <div
          ref={previewViewportRef}
          className="max-h-[calc(100dvh-5.75rem)] min-h-72 overflow-auto rounded-2xl bg-muted/25 p-2"
        >
          <h2 id="positioner-canvas-heading" className="sr-only">
            Responsive trail image positioning canvas
          </h2>
          <div
            ref={imageCanvasRef}
            onPointerDown={handleCanvasPointerDown}
            className={cn(
              "relative mx-auto shrink-0 touch-none overflow-hidden rounded-[2rem] border-2 border-dashed bg-muted/35 shadow-xl",
              imagePreview ? "border-primary/30" : "border-border",
            )}
            style={{
              aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
              width: previewCanvasWidth,
            }}
          >
            {imagePreview ? (
              <Image
                src={imagePreview.url}
                alt=""
                fill
                unoptimized
                draggable={false}
                sizes={`${activeLayout.previewWidth}px`}
                className="pointer-events-none select-none object-fill"
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (naturalWidth <= 0 || naturalHeight <= 0) return;
                  setImagePreview((preview) =>
                    preview ? { ...preview, naturalWidth, naturalHeight } : null,
                  );
                  setImageDimensions({ width: naturalWidth, height: naturalHeight });
                }}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center p-8 text-center text-muted-foreground">
                <div>
                  <ImagePlusIcon className="mx-auto size-10" aria-hidden="true" />
                  <p className="mt-3 font-semibold text-foreground">No trail image selected</p>
                  <p className="mt-1 text-sm">Choose a PNG to place real-size controls.</p>
                </div>
              </div>
            )}

            {imagePreview &&
              activePositions.map((position, index) => {
                const isCurrent = index === currentWaypoint - 1;
                const isClipped = clippedIndexes.includes(index);
                const buttonSize = isCurrent
                  ? activeLayout.currentButtonSize
                  : activeLayout.buttonSize;
                const renderedButtonSize = buttonSize * renderedScale;

                return (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Waypoint ${index + 1} at ${position.x}% horizontal and ${position.y}% vertical`}
                    aria-pressed={selectedIndex === index}
                    onPointerDown={(event) => handleMarkerPointerDown(event, index)}
                    onPointerMove={(event) => handleMarkerPointerMove(event, index)}
                    onKeyDown={(event) => handleMarkerKeyDown(event, index)}
                    className={cn(
                      "absolute z-10 grid -translate-x-1/2 -translate-y-1/2 touch-none place-items-center rounded-full border-4 text-base font-black shadow-[0_5px_0_rgb(0_0_0/0.3)] outline-none transition focus-visible:ring-4 focus-visible:ring-ring/60 motion-reduce:transition-none",
                      isClipped
                        ? "border-red-200 bg-red-600 text-white"
                        : selectedIndex === index
                          ? "scale-105 border-amber-200 bg-amber-500 text-amber-950"
                          : "border-emerald-200 bg-emerald-600 text-white hover:scale-[1.03]",
                    )}
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                      width: renderedButtonSize,
                      height: renderedButtonSize,
                      borderWidth: Math.max(1, 4 * renderedScale),
                      fontSize: Math.max(9, 16 * renderedScale),
                    }}
                  >
                    {index + 1}
                  </button>
                );
              })}
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Requested preview: {activeLayout.previewWidth}px. Rendered preview:{" "}
            {Math.round(renderedCanvasSize.width)} x {Math.round(renderedCanvasSize.height)}px /{" "}
            {Math.round(renderedScale * 100)}% zoom.
          </p>
        </div>
      </section>

      <TooltipProvider>
        <aside
          className="hidden xl:sticky xl:top-20 xl:block"
          aria-label="Waypoint position controls"
        >
          {renderControlPanels("desktop")}
        </aside>
      </TooltipProvider>

      </div>
    </div>
  );
}
