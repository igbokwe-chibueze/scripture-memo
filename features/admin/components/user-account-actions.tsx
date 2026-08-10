"use client";

import { useState, useTransition } from "react";
import {
  BanIcon,
  EllipsisVerticalIcon,
  LogOutIcon,
  RotateCcwIcon,
  Trash2Icon,
  UserCogIcon,
} from "lucide-react";
import { toast } from "sonner";
import { anonymizeUserAccountAction } from "@/features/admin/actions/anonymize-user-account.action";
import { revokeUserSessionsAction } from "@/features/admin/actions/revoke-user-sessions.action";
import { setUserSuspensionAction } from "@/features/admin/actions/set-user-suspension.action";
import type { AdminUserListItem } from "@/features/admin/types/admin.types";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { showActionError } from "@/lib/errors/show-action-error";
import { cn } from "@/lib/utils";

type AccountDialog = "revoke" | "suspension" | "delete" | null;

/**
 * Groups sensitive account operations behind one consistent tactile menu.
 *
 * Each operation still crosses its own authenticated, validated, audited Server
 * Action boundary. Hiding controls in a dropdown improves visual density but is
 * never treated as authorization. Destructive operations require a second
 * confirmation so an accidental touch cannot alter account access or identity.
 */
export function UserAccountActions({
  user,
  currentUserId,
}: {
  user: AdminUserListItem;
  currentUserId: string;
}): React.ReactNode {
  const [dialog, setDialog] = useState<AccountDialog>(null);
  const [reason, setReason] = useState(user.suspendReason ?? "");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();
  const isCurrentUser = user.id === currentUserId;
  const isSuspended = user.suspendedAt !== null;
  const isDeleted = user.suspendReason === "ACCOUNT_ANONYMIZED";
  const displayName = user.displayName || user.name;

  function closeDialog(): void {
    if (isPending) return;
    setDialog(null);
    setDeleteConfirmation("");
  }

  function revokeSessions(): void {
    startTransition(async () => {
      const result = await revokeUserSessionsAction({ userId: user.id });
      if (!result.success) return showActionError(result);
      toast.success(result.message, { duration: 4_000 });
      setDialog(null);
    });
  }

  function updateSuspension(): void {
    startTransition(async () => {
      const result = await setUserSuspensionAction({
        userId: user.id,
        suspended: !isSuspended,
        reason: isSuspended ? undefined : reason,
      });
      if (!result.success) return showActionError(result);
      toast.success(result.message, { duration: 4_000 });
      setDialog(null);
    });
  }

  function deleteAccount(): void {
    startTransition(async () => {
      const result = await anonymizeUserAccountAction({
        userId: user.id,
        confirmation: deleteConfirmation,
      });
      if (!result.success) return showActionError(result);
      toast.success(result.message, { duration: 4_000 });
      setDeleteConfirmation("");
      setDialog(null);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            "size-11 p-0",
          )}
          aria-label={`Open actions for ${displayName}`}
          disabled={isPending || isDeleted}
        >
          <EllipsisVerticalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5 font-black">
              Account actions
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="min-h-11 cursor-pointer gap-3 px-3 font-bold"
              disabled={isCurrentUser}
              onClick={() => setDialog("revoke")}
            >
              <LogOutIcon aria-hidden="true" />
              Revoke sessions
            </DropdownMenuItem>
            <DropdownMenuItem
              className="min-h-11 cursor-pointer gap-3 px-3 font-bold"
              disabled={isCurrentUser}
              onClick={() => setDialog("suspension")}
            >
              {isSuspended ? (
                <RotateCcwIcon aria-hidden="true" />
              ) : (
                <BanIcon aria-hidden="true" />
              )}
              {isSuspended ? "Restore account" : "Suspend account"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            className="min-h-11 cursor-pointer gap-3 px-3 font-bold"
            disabled={isCurrentUser}
            onClick={() => setDialog("delete")}
          >
            <Trash2Icon aria-hidden="true" />
            Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "revoke"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader className="pr-14">
            <DialogTitle>Revoke all sessions?</DialogTitle>
            <DialogDescription>
              {displayName} will be signed out on every device and can sign in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 min-h-11 w-full sm:w-auto" disabled={isPending} onClick={closeDialog}>
              Cancel
            </Button>
            <LoadingButton type="button" className="h-11 min-h-11 w-full sm:w-auto" isPending={isPending} pendingLabel="Revoking" onClick={revokeSessions}>
              <LogOutIcon aria-hidden="true" />
              Revoke sessions
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "suspension"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader className="pr-14">
            <DialogTitle>{isSuspended ? "Restore account?" : "Suspend account?"}</DialogTitle>
            <DialogDescription>
              {isSuspended
                ? `${displayName} will be allowed to sign in again.`
                : `All active sessions for ${displayName} will be revoked.`}
            </DialogDescription>
          </DialogHeader>
          {!isSuspended && (
            <label className="grid gap-1.5 text-sm font-bold">
              Reason
              <Input
                value={reason}
                onChange={(event) => setReason(event.currentTarget.value)}
                placeholder="Reason for suspending this account"
                maxLength={500}
                className="h-11"
              />
            </label>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 min-h-11 w-full sm:w-auto" disabled={isPending} onClick={closeDialog}>
              Cancel
            </Button>
            <LoadingButton
              type="button"
              variant={isSuspended ? "default" : "destructive"}
              className="h-11 min-h-11 w-full sm:w-auto"
              isPending={isPending}
              pendingLabel={isSuspended ? "Restoring" : "Suspending"}
              disabled={!isSuspended && !reason.trim()}
              onClick={updateSuspension}
            >
              <UserCogIcon aria-hidden="true" />
              {isSuspended ? "Restore account" : "Suspend account"}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader className="pr-14">
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              Sign-in access and identifying data will be permanently removed.
              Historical progression and audit records will remain anonymous.
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1.5 text-sm font-bold">
            Type DELETE to confirm
            <Input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.currentTarget.value)}
              autoComplete="off"
              className="h-11"
            />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 min-h-11 w-full sm:w-auto" disabled={isPending} onClick={closeDialog}>
              Cancel
            </Button>
            <LoadingButton
              type="button"
              variant="destructive"
              className="h-11 min-h-11 w-full sm:w-auto"
              isPending={isPending}
              pendingLabel="Deleting"
              disabled={deleteConfirmation !== "DELETE"}
              onClick={deleteAccount}
            >
              <Trash2Icon aria-hidden="true" />
              Delete account
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
