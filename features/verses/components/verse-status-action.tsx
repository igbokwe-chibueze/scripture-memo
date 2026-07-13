"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ArchiveIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { showActionError } from "@/lib/errors/show-action-error";
import { archiveVerseAction } from "@/features/verses/actions/archive-verse.action";
import { publishVerseAction } from "@/features/verses/actions/publish-verse.action";

/** Confirmation-gated publish/archive control for one verse table row. */
export function VerseStatusAction({ id, isActive }: { id: string; isActive: boolean }): React.ReactNode {
  const [isPending, startTransition] = useTransition();
  return (
    <ConfirmationDialog
      title={isActive ? "Archive this verse?" : "Publish this verse?"}
      description={isActive ? "It will no longer be available for new curriculum use." : "It will become available for curriculum assignment."}
      confirmLabel={isActive ? "Archive" : "Publish"}
      destructive={isActive}
      isConfirmDisabled={isPending}
      trigger={
        <Button variant="ghost" size="icon" aria-label={isActive ? "Archive verse" : "Publish verse"}>
          {isActive ? <ArchiveIcon /> : <UploadIcon />}
        </Button>
      }
      onConfirm={() => {
        startTransition(async () => {
          const result = isActive
            ? await archiveVerseAction({ id })
            : await publishVerseAction({ id });
          if (result.success) {
            toast.success(result.message);
          } else {
            showActionError(result);
          }
        });
      }}
    />
  );
}
