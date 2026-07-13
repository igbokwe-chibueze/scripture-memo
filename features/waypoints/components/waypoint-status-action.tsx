"use client";

import { useTransition } from "react";
import { EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { hideWaypointAction } from "@/features/waypoints/actions/hide-waypoint.action";
import { publishWaypointAction } from "@/features/waypoints/actions/publish-waypoint.action";

export type WaypointStatusActionProps = {
  id: string;
  number: number;
  isActive: boolean;
  canPublish: boolean;
  disabled?: boolean;
};

/** Confirmation-gated visibility control for a curriculum waypoint. */
export function WaypointStatusAction({ id, number, isActive, canPublish, disabled = false }: WaypointStatusActionProps): React.ReactNode {
  const [isPending, startTransition] = useTransition();
  const unavailable = disabled || isPending || (!isActive && !canPublish);

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
        <Button type="button" variant={isActive ? "outline" : "default"} className="min-h-11" disabled={unavailable}>
          {isActive ? <EyeOff aria-hidden="true" /> : <Send aria-hidden="true" />}
          {isActive ? "Hide" : "Publish"}
        </Button>
      }
      onConfirm={() => startTransition(async () => {
        const result = isActive ? await hideWaypointAction({ id }) : await publishWaypointAction({ id });
        if (result.success) toast.success(result.message);
        else toast.error(result.message, { duration: Infinity });
      })}
    />
  );
}
