"use client";

import { useTransition } from "react";
import { EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { showActionError } from "@/lib/errors/show-action-error";
import { hideWaypointAction } from "@/features/waypoints/actions/hide-waypoint.action";
import { publishWaypointAction } from "@/features/waypoints/actions/publish-waypoint.action";

export type WaypointStatusActionProps = {
  id: string;
  number: number;
  isActive: boolean;
  canPublish: boolean;
  statusChangeAllowed?: boolean;
  disabledReason?: string;
  disabled?: boolean;
};

/** Confirmation-gated visibility control for a curriculum waypoint. */
export function WaypointStatusAction({
  id,
  number,
  isActive,
  canPublish,
  statusChangeAllowed = true,
  disabledReason,
  disabled = false,
}: WaypointStatusActionProps): React.ReactNode {
  const [isPending, startTransition] = useTransition();
  const unavailable = disabled || isPending || !statusChangeAllowed || (!isActive && !canPublish);
  const pendingLabel = isActive ? "Hiding waypoint" : "Publishing waypoint";

  return (
    <ConfirmationDialog
      title={isActive ? `Hide waypoint ${number}?` : `Publish waypoint ${number}?`}
      description={isActive
        ? "Learners will no longer be able to enter this waypoint. Its assignment remains saved."
        : "This waypoint will become available when progression unlocks it for a learner."}
      confirmLabel={isActive ? "Hide waypoint" : "Publish waypoint"}
      destructive={isActive}
      isConfirmDisabled={unavailable}
      trigger={
        <Button
          type="button"
          variant={isActive ? "outline" : "default"}
          className="min-h-11"
          disabled={unavailable}
          aria-busy={isPending}
          title={unavailable && !isPending ? disabledReason : undefined}
        >
          {isPending ? <LoadingSpinner size="sm" label={pendingLabel} /> : isActive ? <EyeOff aria-hidden="true" /> : <Send aria-hidden="true" />}
          {isPending ? (isActive ? "Hiding…" : "Publishing…") : isActive ? "Hide" : "Publish"}
        </Button>
      }
      onConfirm={() => startTransition(async () => {
        const result = isActive ? await hideWaypointAction({ id }) : await publishWaypointAction({ id });
        if (result.success) toast.success(result.message);
        else showActionError(result);
      })}
    />
  );
}
