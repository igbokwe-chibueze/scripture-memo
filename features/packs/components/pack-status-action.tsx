"use client";

import { useTransition } from "react";
import { EyeOff, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { hidePackAction } from "@/features/packs/actions/hide-pack.action";
import { publishPackAction } from "@/features/packs/actions/publish-pack.action";

export type PackStatusActionProps = {
  id: string;
  name: string;
  isActive: boolean;
  publishableVerseCount: number;
};

/** Confirmation-gated pack visibility control for list and edit views. */
export function PackStatusAction({ id, name, isActive, publishableVerseCount }: PackStatusActionProps): React.ReactNode {
  const [isPending, startTransition] = useTransition();
  return (
    <ConfirmationDialog
      title={isActive ? `Hide ${name}?` : `Publish ${name}?`}
      description={isActive
        ? "Learners will no longer discover this pack, but its verse order will be preserved."
        : "This pack will become available to learners with its current verse order."}
      confirmLabel={isActive ? "Hide pack" : "Publish pack"}
      destructive={isActive}
      isConfirmDisabled={isPending || (!isActive && publishableVerseCount === 0)}
      trigger={
        <Button variant={isActive ? "outline" : "default"} className="min-h-11" disabled={!isActive && publishableVerseCount === 0}>
          {isActive ? <EyeOff aria-hidden="true" /> : <Send aria-hidden="true" />}
          {isActive ? "Hide" : "Publish"}
        </Button>
      }
      onConfirm={() => {
        startTransition(async () => {
          const result = isActive
            ? await hidePackAction({ id })
            : await publishPackAction({ id });
          if (result.success) toast.success(result.message);
          else toast.error(result.message, { duration: Infinity });
        });
      }}
    />
  );
}
