"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConicalIcon, PlayIcon, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/shared/loading-button";
import { Card, CardContent } from "@/components/ui/card";
import { showActionError } from "@/lib/errors/show-action-error";
import { startAdminGameplayTestAction } from "@/features/gameplay/actions/start-admin-gameplay-test.action";
import type {
  GameMode,
  JourneyStage,
} from "@/lib/generated/prisma/enums";

type TestableWaypoint = {
  id: string;
  number: number;
  journeyStage: JourneyStage;
  verse: {
    reference: string;
  } | null;
};

const gameModes: Array<{ value: GameMode; label: string }> = [
  { value: "DRAG_DROP", label: "Drag & Drop" },
  { value: "PUZZLE", label: "Puzzle" },
  { value: "SWAP", label: "Swap" },
  { value: "CUE", label: "Cue" },
  { value: "FILL", label: "Fill" },
];

/**
 * Starts one isolated test through the production gameplay engine.
 *
 * The browser selects only a waypoint and mode. The server reloads the actual
 * verse, translation, and Journey Stage so this convenience control cannot
 * weaken timer, hint, answer, or authorization rules.
 */
export function JourneyStageTestLauncher({
  waypoints,
}: {
  waypoints: TestableWaypoint[];
}): React.ReactNode {
  const router = useRouter();
  const assignedWaypoints = waypoints.filter(
    (waypoint) => waypoint.verse !== null,
  );
  const [waypointId, setWaypointId] = useState(
    assignedWaypoints[0]?.id ?? "",
  );
  const [gameMode, setGameMode] = useState<GameMode>("DRAG_DROP");
  const [isPending, startTransition] = useTransition();

  const startTest = (): void => {
    startTransition(async () => {
      const result = await startAdminGameplayTestAction({
        waypointId,
        gameMode,
      });
      if (!result.success) {
        showActionError(result);
        return;
      }
      if (!result.data) return;

      toast.success(result.message, { duration: 4_000 });
      router.push(result.data.redirectTo);
    });
  };

  return (
    <Card className="overflow-hidden border-sky-500/25 bg-sky-500/5">
      <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)] lg:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300">
              <FlaskConicalIcon aria-hidden="true" />
            </span>
            <div>
              <p className="font-heading text-lg font-black">
                Journey Stage testing
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Run any assigned waypoint in the real gameplay engine.
              </p>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs font-bold text-sky-800 dark:text-sky-200">
            <ShieldCheckIcon className="size-4 shrink-0" aria-hidden="true" />
            Admin testing · no progress changes
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]">
          <label className="grid gap-1.5 text-sm font-bold">
            Waypoint
            <select
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={waypointId}
              disabled={isPending || assignedWaypoints.length === 0}
              onChange={(event) => setWaypointId(event.target.value)}
            >
              {assignedWaypoints.map((waypoint) => (
                <option key={waypoint.id} value={waypoint.id}>
                  {waypoint.number}. {waypoint.verse?.reference} · {waypoint.journeyStage}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-sm font-bold">
            Mode
            <select
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={gameMode}
              disabled={isPending || assignedWaypoints.length === 0}
              onChange={(event) => setGameMode(event.target.value as GameMode)}
            >
              {gameModes.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>

          <LoadingButton
            type="button"
            className="min-h-11 sm:col-span-2 lg:col-span-1"
            isPending={isPending}
            pendingLabel="Opening test"
            disabled={!waypointId || assignedWaypoints.length === 0}
            onClick={startTest}
          >
            <PlayIcon aria-hidden="true" />
            Test
          </LoadingButton>
        </div>
      </CardContent>
    </Card>
  );
}
