"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { showActionError } from "@/lib/errors/show-action-error";
import { deleteWaypointAction } from "@/features/waypoints/actions/delete-waypoint.action";

type WaypointDeleteActionProps = {
  id: string;
  number: number;
  disabled?: boolean;
};

/** Confirmation-gated control for the one safely disposable waypoint shape. */
export function WaypointDeleteAction({
  id,
  number,
  disabled = false,
}: WaypointDeleteActionProps): React.ReactNode {
  const [isPending, startTransition] = useTransition();

  return (
    <ConfirmationDialog
      title={`Delete waypoint ${number}?`}
      description="This final hidden waypoint is unassigned and has no learner history. Deletion cannot be undone."
      confirmLabel="Delete waypoint"
      destructive
      isConfirmDisabled={disabled || isPending}
      trigger={
        <Button
          type="button"
          variant="destructive"
          className="min-h-11"
          disabled={disabled || isPending}
          aria-busy={isPending}
        >
          {isPending
            ? <LoadingSpinner size="sm" label="Deleting waypoint" />
            : <Trash2 aria-hidden="true" />}
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      }
      onConfirm={() => startTransition(async () => {
        const result = await deleteWaypointAction({ id });
        if (result.success) {
          toast.success(result.message);
        } else {
          showActionError(result);
        }
      })}
    />
  );
}
