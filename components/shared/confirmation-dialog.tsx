"use client";

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
import { Button } from "@/components/ui/button";

export type ConfirmationDialogProps = {
  /** Control that opens the dialog; omitted when a parent controls `open`. */
  trigger?: React.ReactNode;
  /** Describes the decision in a concise dialog heading. */
  title: string;
  /** Explains consequences before the user commits to the action. */
  description: string;
  /** Runs only after the explicit confirmation control is activated. */
  onConfirm: () => void;
  /** Custom confirmation copy; defaults to a neutral action label. */
  confirmLabel?: string;
  /** Custom cancellation copy. */
  cancelLabel?: string;
  /** Uses destructive styling for irreversible or high-risk operations. */
  destructive?: boolean;
  /** Disables confirmation while the owning operation is unavailable. */
  isConfirmDisabled?: boolean;
  /** Optional controlled open state for programmatic workflows. */
  open?: boolean;
  /** Receives open-state changes when controlled by a parent. */
  onOpenChange?: (open: boolean) => void;
};

/**
 * Requires explicit confirmation before consequential user actions.
 *
 * Cancel is the first focus-safe escape path and the dialog never infers whether
 * an action is destructive; the owning feature must opt into danger styling.
 */
export function ConfirmationDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isConfirmDisabled = false,
  open,
  onOpenChange,
}: ConfirmationDialogProps): React.ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger as React.ReactElement} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" className="min-h-11" />}>
            {cancelLabel}
          </DialogClose>
          <DialogClose
            render={
              <Button
                variant={destructive ? "destructive" : "default"}
                className="min-h-11"
                disabled={isConfirmDisabled}
              />
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
