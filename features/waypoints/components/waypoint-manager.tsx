"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import { cn } from "@/lib/utils";
import { reorderWaypointsAction } from "@/features/waypoints/actions/reorder-waypoints.action";
import { WaypointAssignmentDialog } from "@/features/waypoints/components/waypoint-assignment-dialog";
import { WaypointStatusAction } from "@/features/waypoints/components/waypoint-status-action";
import type { JourneyStage } from "@/lib/generated/prisma/enums";

export type ManagedWaypoint = {
  id: string;
  number: number;
  journeyStage: JourneyStage;
  isActive: boolean;
  verse: { id: string; reference: string; book: string; isActive: boolean } | null;
};

export type WaypointManagerProps = {
  initialWaypoints: ManagedWaypoint[];
  publishedVerses: { id: string; reference: string; book: string }[];
};

const stageLabels: Record<JourneyStage, string> = {
  LEARN: "Learn",
  RECALL: "Recall",
  STRENGTHEN: "Strengthen",
  MASTER: "Master",
};

const stageClasses: Record<JourneyStage, string> = {
  LEARN: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  RECALL: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  STRENGTHEN: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  MASTER: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

/** Manages all fixed curriculum slots with staged, explicitly saved ordering. */
export function WaypointManager({ initialWaypoints, publishedVerses }: WaypointManagerProps): React.ReactNode {
  const [waypoints, setWaypoints] = useState(initialWaypoints);
  const [isPending, startTransition] = useTransition();
  const initialOrder = useMemo(() => initialWaypoints.map(({ id }) => id).join("|"), [initialWaypoints]);
  const currentOrder = waypoints.map(({ id }) => id).join("|");
  const hasUnsavedOrder = initialOrder !== currentOrder;

  function moveWaypoint(from: number, to: number): void {
    if (to < 0 || to >= waypoints.length || from === to || isPending) return;
    setWaypoints((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(to, 0, moved);
      return next.map((waypoint, index) => ({ ...waypoint, number: index + 1 }));
    });
  }

  function saveOrder(): void {
    startTransition(async () => {
      const result = await reorderWaypointsAction({ orderedWaypointIds: waypoints.map(({ id }) => id) });
      if (result.success) toast.success(result.message);
      else {
        setWaypoints(initialWaypoints);
        toast.error(result.message, { duration: Infinity });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{waypoints.length} curriculum slots</p>
          <p className="text-sm text-muted-foreground">
            {hasUnsavedOrder ? "Save the new order before editing assignments or visibility." : "Move controls change curriculum order; assignments travel with their waypoint."}
          </p>
        </div>
        <div className="flex gap-2">
          {hasUnsavedOrder && <Button type="button" variant="outline" className="min-h-11" disabled={isPending} onClick={() => setWaypoints(initialWaypoints)}>Discard</Button>}
          <LoadingButton type="button" isPending={isPending} pendingLabel="Saving order" disabled={!hasUnsavedOrder} onClick={saveOrder}>
            <Save aria-hidden="true" /> Save order
          </LoadingButton>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
        <table className="w-full min-w-4xl border-collapse text-sm">
          <caption className="sr-only">All 220 administrative waypoint slots</caption>
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="h-11 px-4 text-left font-semibold">Slot</th>
              <th scope="col" className="h-11 px-4 text-left font-semibold">Assigned verse</th>
              <th scope="col" className="h-11 px-4 text-left font-semibold">Journey Stage</th>
              <th scope="col" className="h-11 px-4 text-left font-semibold">Status</th>
              <th scope="col" className="h-11 px-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {waypoints.map((waypoint, index) => {
              const canPublish = Boolean(waypoint.verse?.isActive);
              return (
                <tr key={waypoint.id} className={cn("transition-colors hover:bg-muted/35", hasUnsavedOrder && "bg-amber-500/5")}>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{index + 1}</span>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon-lg" disabled={isPending || index === 0} aria-label={`Move waypoint ${index + 1} up`} onClick={() => moveWaypoint(index, index - 1)}><ArrowUp aria-hidden="true" /></Button>
                        <Button type="button" variant="ghost" size="icon-lg" disabled={isPending || index === waypoints.length - 1} aria-label={`Move waypoint ${index + 1} down`} onClick={() => moveWaypoint(index, index + 1)}><ArrowDown aria-hidden="true" /></Button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    {waypoint.verse ? <div><p className="font-semibold">{waypoint.verse.reference}</p><p className="text-xs text-muted-foreground">{waypoint.verse.book}</p></div> : <span className="text-muted-foreground">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3 align-middle"><Badge variant="outline" className={stageClasses[waypoint.journeyStage]}>{stageLabels[waypoint.journeyStage]}</Badge></td>
                  <td className="px-4 py-3 align-middle"><Badge variant={waypoint.isActive ? "default" : "outline"}>{waypoint.isActive ? "Published" : "Hidden"}</Badge></td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex justify-end gap-2">
                      <WaypointAssignmentDialog
                        waypointId={waypoint.id}
                        waypointNumber={index + 1}
                        initialVerseId={waypoint.verse?.id ?? ""}
                        initialJourneyStage={waypoint.journeyStage}
                        publishedVerses={publishedVerses}
                        disabled={hasUnsavedOrder || isPending}
                      />
                      <WaypointStatusAction id={waypoint.id} number={index + 1} isActive={waypoint.isActive} canPublish={canPublish} disabled={hasUnsavedOrder || isPending} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
