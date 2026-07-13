"use client";

import { useState, type FormEvent } from "react";
import { MoveVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type ProposedWaypointMoveResult =
  | { success: true; affectedCount: number }
  | { success: false; message: string };

export type WaypointPositionDialogProps = {
  waypointNumber: number;
  totalWaypoints: number;
  disabled?: boolean;
  disabledReason?: string;
  onMove: (destination: number) => ProposedWaypointMoveResult;
};

/** Moves one editable waypoint directly to a validated proposed position. */
export function WaypointPositionDialog({
  waypointNumber,
  totalWaypoints,
  disabled = false,
  disabledReason,
  onMove,
}: WaypointPositionDialogProps): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState(String(waypointNumber));
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean): void {
    // WHY: A row can receive a new proposed number while this component remains
    // mounted. Resetting from props prevents an old destination from being
    // mistaken for the waypoint's current proposed position when reopened.
    setDestination(String(waypointNumber));
    setError(null);
    setOpen(nextOpen);
  }

  function submitMove(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const parsedDestination = Number(destination);
    if (!Number.isInteger(parsedDestination) || parsedDestination < 1 || parsedDestination > totalWaypoints) {
      setError(`Enter a whole number from 1 to ${totalWaypoints}.`);
      return;
    }
    if (parsedDestination === waypointNumber) {
      setError(`Waypoint ${waypointNumber} is already at that position.`);
      return;
    }

    const result = onMove(parsedDestination);
    if (!result.success) {
      setError(result.message);
      toast.error(result.message, { duration: Infinity });
      return;
    }

    toast.info(`Waypoint ${waypointNumber} moved to position ${parsedDestination} in the proposed order.`, {
      description: `${result.affectedCount} position${result.affectedCount === 1 ? "" : "s"} changed. Save order to persist this move.`,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={disabled}
            title={disabled ? disabledReason : "Move directly to another position"}
          />
        }
      >
        <MoveVertical aria-hidden="true" /> Move
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submitMove}>
          <DialogHeader>
            <DialogTitle>Move waypoint {waypointNumber}</DialogTitle>
            <DialogDescription>
              Choose its new position in the proposed curriculum order. Nothing is persisted until you save the order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-5">
            <label htmlFor={`waypoint-position-${waypointNumber}`} className="text-sm font-medium">
              Destination position
            </label>
            <Input
              id={`waypoint-position-${waypointNumber}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={totalWaypoints}
              step={1}
              value={destination}
              className="min-h-11"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `waypoint-position-error-${waypointNumber}` : undefined}
              onChange={(event) => {
                setDestination(event.target.value);
                setError(null);
              }}
            />
            <p className="text-xs text-muted-foreground">Valid positions: 1–{totalWaypoints}</p>
            {error && (
              <p id={`waypoint-position-error-${waypointNumber}`} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" className="min-h-11" />}>
              Cancel
            </DialogClose>
            <Button type="submit" className="min-h-11">Apply proposed move</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
