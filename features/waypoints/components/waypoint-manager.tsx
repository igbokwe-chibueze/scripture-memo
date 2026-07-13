"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, BookOpenCheck, Eye, EyeOff, FileQuestion, MapPinned, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingButton } from "@/components/shared/loading-button";
import { cn } from "@/lib/utils";
import { showActionError } from "@/lib/errors/show-action-error";
import { createWaypointAction } from "@/features/waypoints/actions/create-waypoint.action";
import { reorderWaypointsAction } from "@/features/waypoints/actions/reorder-waypoints.action";
import { WaypointAssignmentDialog } from "@/features/waypoints/components/waypoint-assignment-dialog";
import {
  WaypointPositionDialog,
  type ProposedWaypointMoveResult,
} from "@/features/waypoints/components/waypoint-position-dialog";
import { WaypointStatusAction } from "@/features/waypoints/components/waypoint-status-action";
import type { JourneyStage } from "@/lib/generated/prisma/enums";

export type ManagedWaypoint = {
  id: string;
  number: number;
  journeyStage: JourneyStage;
  isActive: boolean;
  verse: { id: string; reference: string; book: string; isActive: boolean } | null;
  _count: { userProgress: number; dayProgress: number; gameSessions: number };
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

const stageRank: Record<JourneyStage, number> = {
  LEARN: 0,
  RECALL: 1,
  STRENGTHEN: 2,
  MASTER: 3,
};

type StatisticCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
};

/** Compact administrative curriculum statistic. */
function StatisticCard({ label, value, icon }: StatisticCardProps): React.ReactNode {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
        <div><p className="text-2xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
      </CardContent>
    </Card>
  );
}

/** Manages an append-only curriculum with validated, explicitly saved ordering. */
export function WaypointManager({ initialWaypoints, publishedVerses }: WaypointManagerProps): React.ReactNode {
  const [waypoints, setWaypoints] = useState(initialWaypoints);
  const [isReordering, startReorderTransition] = useTransition();
  const [isCreating, startCreateTransition] = useTransition();
  const initialOrder = useMemo(() => initialWaypoints.map(({ id }) => id).join("|"), [initialWaypoints]);
  const initialNumberById = useMemo(() => new Map(initialWaypoints.map(({ id, number }) => [id, number])), [initialWaypoints]);
  const currentOrder = waypoints.map(({ id }) => id).join("|");
  const hasUnsavedOrder = initialOrder !== currentOrder;
  const publishedCount = waypoints.filter(({ isActive }) => isActive).length;
  const hiddenCount = waypoints.length - publishedCount;
  const unassignedCount = waypoints.filter(({ verse }) => !verse).length;
  const assignedCount = waypoints.length - unassignedCount;
  const proposedMoves = waypoints.flatMap((waypoint, index) => {
    const from = initialNumberById.get(waypoint.id) ?? index + 1;
    const to = index + 1;
    return from === to ? [] : [{ id: waypoint.id, reference: waypoint.verse?.reference ?? "Unassigned waypoint", from, to }];
  });

  function hasProgress(waypoint: ManagedWaypoint): boolean {
    return waypoint._count.userProgress > 0 || waypoint._count.dayProgress > 0 || waypoint._count.gameSessions > 0;
  }

  function getProposedOrderError(proposed: ManagedWaypoint[]): string | null {
    const shiftedHistoricalWaypoint = proposed.find((waypoint, index) =>
      hasProgress(waypoint) && initialNumberById.get(waypoint.id) !== index + 1,
    );
    if (shiftedHistoricalWaypoint) {
      return `Waypoint ${initialNumberById.get(shiftedHistoricalWaypoint.id) ?? shiftedHistoricalWaypoint.number} has learner history and cannot change position.`;
    }

    let hiddenSeen = false;
    for (const waypoint of proposed) {
      if (!waypoint.isActive) hiddenSeen = true;
      else if (hiddenSeen) return "A hidden waypoint cannot be placed before a published waypoint.";
    }

    const lastStageByVerse = new Map<string, JourneyStage>();
    for (const waypoint of proposed) {
      if (!waypoint.verse) continue;
      const previousStage = lastStageByVerse.get(waypoint.verse.id);
      if (previousStage && stageRank[previousStage] > stageRank[waypoint.journeyStage]) {
        return `${waypoint.verse.reference} cannot move backwards through its Journey Stages.`;
      }
      lastStageByVerse.set(waypoint.verse.id, waypoint.journeyStage);
    }
    return null;
  }

  function proposeWaypointMove(from: number, to: number): ProposedWaypointMoveResult {
    if (isReordering || to < 0 || to >= waypoints.length || from < 0 || from >= waypoints.length) {
      return { success: false, message: "That waypoint move is no longer available." };
    }
    if (from === to) return { success: true, affectedCount: 0 };

    const proposed = [...waypoints];
    const [moved] = proposed.splice(from, 1);
    if (!moved) return { success: false, message: "That waypoint no longer exists." };
    proposed.splice(to, 0, moved);
    const numberedProposal = proposed.map((waypoint, index) => ({ ...waypoint, number: index + 1 }));
    const error = getProposedOrderError(numberedProposal);
    if (error) return { success: false, message: error };

    const affectedCount = numberedProposal.filter((waypoint, index) => waypoints[index]?.id !== waypoint.id).length;
    setWaypoints(numberedProposal);
    return { success: true, affectedCount };
  }

  function moveWaypointOneStep(from: number, to: number): void {
    const result = proposeWaypointMove(from, to);
    if (!result.success) toast.error(result.message, { duration: Infinity });
  }

  function saveOrder(): void {
    startReorderTransition(async () => {
      const result = await reorderWaypointsAction({ orderedWaypointIds: waypoints.map(({ id }) => id) });
      if (result.success) {
        const firstMove = result.data?.moves[0];
        toast.success(result.message, {
          description: firstMove
            ? `${firstMove.reference ?? "Unassigned waypoint"}: ${firstMove.from} → ${firstMove.to}${(result.data?.moves.length ?? 0) > 1 ? `, plus ${(result.data?.moves.length ?? 1) - 1} more.` : "."}`
            : undefined,
        });
      } else {
        setWaypoints(initialWaypoints);
        showActionError(result);
      }
    });
  }

  function addWaypoint(): void {
    startCreateTransition(async () => {
      const result = await createWaypointAction({});
      if (result.success) toast.success(result.message);
      else showActionError(result);
    });
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Waypoint statistics">
        <StatisticCard label="Total waypoints" value={waypoints.length} icon={<MapPinned aria-hidden="true" />} />
        <StatisticCard label="Assigned" value={assignedCount} icon={<BookOpenCheck aria-hidden="true" />} />
        <StatisticCard label="Published" value={publishedCount} icon={<Eye aria-hidden="true" />} />
        <StatisticCard label="Hidden" value={hiddenCount} icon={<EyeOff aria-hidden="true" />} />
        <StatisticCard label="Unassigned" value={unassignedCount} icon={<FileQuestion aria-hidden="true" />} />
      </section>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-semibold">Curriculum order</p>
          <p className="text-sm text-muted-foreground">
            {hasUnsavedOrder ? `${proposedMoves.length} positions will change. Save before editing assignments or visibility.` : "New waypoints append to the end as hidden, unassigned drafts."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LoadingButton type="button" variant="outline" isPending={isCreating} pendingLabel="Adding waypoint" disabled={hasUnsavedOrder || isReordering} onClick={addWaypoint}>
            <Plus aria-hidden="true" /> Add waypoint
          </LoadingButton>
          {hasUnsavedOrder && <Button type="button" variant="outline" className="min-h-11" disabled={isReordering} onClick={() => setWaypoints(initialWaypoints)}>Discard</Button>}
          <LoadingButton type="button" isPending={isReordering} pendingLabel="Saving order" disabled={!hasUnsavedOrder || isCreating} onClick={saveOrder}>
            <Save aria-hidden="true" /> Save order
          </LoadingButton>
        </div>
      </div>

      {hasUnsavedOrder && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4" aria-live="polite">
          <p className="font-semibold text-amber-800 dark:text-amber-200">Proposed movement</p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900/80 dark:text-amber-100/80">
            {proposedMoves.slice(0, 5).map((move) => <li key={move.id}>{move.reference}: waypoint {move.from} → {move.to}</li>)}
            {proposedMoves.length > 5 && <li>Plus {proposedMoves.length - 5} more position changes.</li>}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-sm">
        <table className="w-full min-w-4xl border-collapse text-sm">
          <caption className="sr-only">All administrative waypoint records</caption>
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="h-11 px-4 text-left font-semibold">Waypoint</th>
              <th scope="col" className="h-11 px-4 text-left font-semibold">Assigned verse</th>
              <th scope="col" className="h-11 px-4 text-left font-semibold">Journey Stage</th>
              <th scope="col" className="h-11 px-4 text-left font-semibold">Status</th>
              <th scope="col" className="h-11 px-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {waypoints.map((waypoint, index) => {
              const previous = waypoints[index - 1];
              const next = waypoints[index + 1];
              const learnerHistoryLocked = hasProgress(waypoint);
              const movementLocked = learnerHistoryLocked;
              const moveUpBlocked = index === 0 || movementLocked || Boolean(previous && (hasProgress(previous) || (!waypoint.isActive && previous.isActive)));
              const moveDownBlocked = index === waypoints.length - 1 || movementLocked || Boolean(next && (hasProgress(next) || (waypoint.isActive && !next.isActive)));
              const isNextHidden = !waypoint.isActive && (index === 0 || Boolean(previous?.isActive));
              const isLastPublished = waypoint.isActive && !waypoints.slice(index + 1).some((candidate) => candidate.isActive);
              const canPublish = Boolean(waypoint.verse?.isActive) && isNextHidden;
              const statusChangeAllowed = !learnerHistoryLocked && (waypoint.isActive ? isLastPublished : isNextHidden);
              const disabledReason = learnerHistoryLocked
                ? "Learner history makes this waypoint permanent."
                : waypoint.isActive
                ? "Hide later published waypoints first."
                : !waypoint.verse
                  ? "Assign a published verse first."
                  : "Publish every earlier waypoint first.";
              const originalNumber = initialNumberById.get(waypoint.id) ?? index + 1;

              return (
                <tr key={waypoint.id} className={cn("transition-colors hover:bg-muted/35", originalNumber !== index + 1 && "bg-amber-500/5")}>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">{index + 1}</span>
                      {originalNumber !== index + 1 && <span className="text-xs text-amber-700 dark:text-amber-300"><span className="sr-only">Previously waypoint </span>{originalNumber} → {index + 1}</span>}
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon-lg" disabled={isReordering || moveUpBlocked} aria-label={`Move waypoint ${index + 1} up`} onClick={() => moveWaypointOneStep(index, index - 1)}><ArrowUp aria-hidden="true" /></Button>
                        <Button type="button" variant="ghost" size="icon-lg" disabled={isReordering || moveDownBlocked} aria-label={`Move waypoint ${index + 1} down`} onClick={() => moveWaypointOneStep(index, index + 1)}><ArrowDown aria-hidden="true" /></Button>
                        <WaypointPositionDialog
                          waypointNumber={index + 1}
                          totalWaypoints={waypoints.length}
                          disabled={isReordering || learnerHistoryLocked || waypoints.length < 2}
                          disabledReason={learnerHistoryLocked
                            ? "Learner history makes this waypoint permanent."
                            : "This waypoint cannot be moved."}
                          onMove={(destination) => proposeWaypointMove(index, destination - 1)}
                        />
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
                        disabled={hasUnsavedOrder || isReordering || isCreating || waypoint.isActive || learnerHistoryLocked}
                        disabledReason={learnerHistoryLocked
                          ? "Learner history makes this assignment permanent."
                          : waypoint.isActive
                            ? "Hide this unstarted waypoint before editing its assignment."
                            : undefined}
                      />
                      <WaypointStatusAction id={waypoint.id} number={index + 1} isActive={waypoint.isActive} canPublish={canPublish} statusChangeAllowed={statusChangeAllowed} disabledReason={disabledReason} disabled={hasUnsavedOrder || isReordering || isCreating} />
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
