"use client";

import { useState, useTransition } from "react";
import {
  BanIcon,
  CalendarClockIcon,
  LayoutGridIcon,
  ListIcon,
  MapPinnedIcon,
  RotateCcwIcon,
  SaveIcon,
  SparklesIcon,
  UserCogIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/shared/loading-button";
import { showActionError } from "@/lib/errors/show-action-error";
import { changeUserRoleAction } from "@/features/admin/actions/change-user-role.action";
import { setUserSuspensionAction } from "@/features/admin/actions/set-user-suspension.action";
import type { AdminUserListItem } from "@/features/admin/types/admin.types";

const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Player",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

// WHY: Explicit locales keep the server-rendered client component identical
// during hydration even when an administrator's browser uses another locale.
const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** Manages one account without trusting any identity or role from the browser. */
function UserAdminCard({
  user,
  currentUserId,
}: {
  user: AdminUserListItem;
  currentUserId: string;
}): React.ReactNode {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [suspensionOpen, setSuspensionOpen] = useState(false);
  const [reason, setReason] = useState(user.suspendReason ?? "");
  const [isPending, startTransition] = useTransition();
  const isCurrentUser = user.id === currentUserId;
  const isSuspended = user.suspendedAt !== null;
  const displayName = user.displayName || user.name;

  function saveRole(): void {
    startTransition(async () => {
      const result = await changeUserRoleAction({
        userId: user.id,
        role: selectedRole,
      });
      if (!result.success) return showActionError(result);
      toast.success(result.message, { duration: 4_000 });
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
      setSuspensionOpen(false);
    });
  }

  return (
    <article className="overflow-hidden rounded-3xl border bg-card">
      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-heading text-lg font-black">
                {displayName}
              </h2>
              {isCurrentUser && <Badge>You</Badge>}
              {isSuspended && <Badge variant="destructive">Suspended</Badge>}
            </div>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
          <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-2xl bg-muted/70 p-3">
            <SparklesIcon className="mb-2 size-4 text-primary" aria-hidden="true" />
            <p className="font-heading text-lg font-black tabular-nums">
              {numberFormatter.format(user.totalGlowPoints)}
            </p>
            <p className="text-xs text-muted-foreground">Glow Points</p>
          </div>
          <div className="rounded-2xl bg-muted/70 p-3">
            <MapPinnedIcon className="mb-2 size-4 text-primary" aria-hidden="true" />
            <p className="font-heading text-lg font-black tabular-nums">
              {numberFormatter.format(user.totalWaypointsCompleted)}
            </p>
            <p className="text-xs text-muted-foreground">Waypoints</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-muted/70 p-3 sm:col-span-1">
            <CalendarClockIcon className="mb-2 size-4 text-primary" aria-hidden="true" />
            <p className="text-sm font-bold">
              {user.lastSeenAt
                ? dateFormatter.format(user.lastSeenAt)
                : "Not recorded"}
            </p>
            <p className="text-xs text-muted-foreground">Last active</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-bold">
            Role
            <select
              value={selectedRole}
              onChange={(event) =>
                setSelectedRole(event.currentTarget.value as UserRole)
              }
              disabled={isPending || isCurrentUser}
              className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
            >
              <option value="USER">Player</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </label>
          <LoadingButton
            type="button"
            variant="outline"
            isPending={isPending}
            pendingLabel="Saving"
            disabled={isCurrentUser || selectedRole === user.role}
            onClick={saveRole}
          >
            <SaveIcon aria-hidden="true" />
            Save role
          </LoadingButton>
          <Button
            type="button"
            variant={isSuspended ? "outline" : "destructive"}
            disabled={isPending || isCurrentUser}
            onClick={() => setSuspensionOpen(true)}
          >
            {isSuspended ? (
              <RotateCcwIcon aria-hidden="true" />
            ) : (
              <BanIcon aria-hidden="true" />
            )}
            {isSuspended ? "Restore" : "Suspend"}
          </Button>
        </div>
      </div>

      <Dialog open={suspensionOpen} onOpenChange={setSuspensionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isSuspended ? "Restore account?" : "Suspend account?"}
            </DialogTitle>
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
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setSuspensionOpen(false)}
            >
              Cancel
            </Button>
            <LoadingButton
              type="button"
              variant={isSuspended ? "default" : "destructive"}
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
    </article>
  );
}

/**
 * Presents the same audited account controls as a compact table row.
 *
 * WHY: The table remains readable on a 375px screen by stacking its secondary
 * fields beneath the identity instead of forcing a wide horizontal scrollbar.
 * Larger screens progressively restore conventional table-like columns.
 */
function UserAdminTableRow({
  user,
  currentUserId,
}: {
  user: AdminUserListItem;
  currentUserId: string;
}): React.ReactNode {
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [suspensionOpen, setSuspensionOpen] = useState(false);
  const [reason, setReason] = useState(user.suspendReason ?? "");
  const [isPending, startTransition] = useTransition();
  const isCurrentUser = user.id === currentUserId;
  const isSuspended = user.suspendedAt !== null;
  const displayName = user.displayName || user.name;

  function saveRole(): void {
    startTransition(async () => {
      const result = await changeUserRoleAction({
        userId: user.id,
        role: selectedRole,
      });
      if (!result.success) return showActionError(result);
      toast.success(result.message, { duration: 4_000 });
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
      setSuspensionOpen(false);
    });
  }

  return (
    <article className="grid gap-4 border-t p-4 first:border-t-0 lg:grid-cols-[minmax(13rem,1.4fr)_minmax(10rem,0.8fr)_minmax(13rem,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate font-heading font-black">{displayName}</h2>
          {isCurrentUser && <Badge>You</Badge>}
          {isSuspended && <Badge variant="destructive">Suspended</Badge>}
        </div>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Last active: {user.lastSeenAt ? dateFormatter.format(user.lastSeenAt) : "Not recorded"}
        </p>
      </div>

      <label className="grid gap-1.5 text-sm font-bold">
        <span className="lg:sr-only">Role</span>
        <select
          value={selectedRole}
          onChange={(event) =>
            setSelectedRole(event.currentTarget.value as UserRole)
          }
          disabled={isPending || isCurrentUser}
          className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        >
          <option value="USER">Player</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-muted/70 p-2.5">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
            Glow
          </span>
          <strong className="mt-1 block tabular-nums">
            {numberFormatter.format(user.totalGlowPoints)}
          </strong>
        </div>
        <div className="rounded-xl bg-muted/70 p-2.5">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPinnedIcon className="size-4 text-primary" aria-hidden="true" />
            Waypoints
          </span>
          <strong className="mt-1 block tabular-nums">
            {numberFormatter.format(user.totalWaypointsCompleted)}
          </strong>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 xl:grid-cols-2">
        <LoadingButton
          type="button"
          variant="outline"
          isPending={isPending}
          pendingLabel="Saving"
          disabled={isCurrentUser || selectedRole === user.role}
          onClick={saveRole}
        >
          <SaveIcon aria-hidden="true" />
          Save
        </LoadingButton>
        <Button
          type="button"
          variant={isSuspended ? "outline" : "destructive"}
          disabled={isPending || isCurrentUser}
          onClick={() => setSuspensionOpen(true)}
        >
          {isSuspended ? <RotateCcwIcon aria-hidden="true" /> : <BanIcon aria-hidden="true" />}
          {isSuspended ? "Restore" : "Suspend"}
        </Button>
      </div>

      <Dialog open={suspensionOpen} onOpenChange={setSuspensionOpen}>
        <DialogContent>
          <DialogHeader>
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
            <Button type="button" variant="outline" disabled={isPending} onClick={() => setSuspensionOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              type="button"
              variant={isSuspended ? "default" : "destructive"}
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
    </article>
  );
}

/** Renders a mobile-first stack of bounded account administration controls. */
export function UserAdminManager({
  users,
  currentUserId,
}: {
  users: AdminUserListItem[];
  currentUserId: string;
}): React.ReactNode {
  const [view, setView] = useState<"table" | "card">("table");

  return (
    <section className="space-y-3" aria-label="User accounts">
      <div className="flex justify-end">
        <div
          className="grid grid-cols-2 gap-1 rounded-2xl border bg-card p-1"
          aria-label="Choose user list view"
        >
          <Button
            type="button"
            variant={view === "table" ? "default" : "ghost"}
            aria-pressed={view === "table"}
            onClick={() => setView("table")}
          >
            <ListIcon aria-hidden="true" />
            Table
          </Button>
          <Button
            type="button"
            variant={view === "card" ? "default" : "ghost"}
            aria-pressed={view === "card"}
            onClick={() => setView("card")}
          >
            <LayoutGridIcon aria-hidden="true" />
            Card
          </Button>
        </div>
      </div>

      {view === "table" ? (
        <div className="overflow-hidden rounded-3xl border bg-card">
          <div className="hidden grid-cols-[minmax(13rem,1.4fr)_minmax(10rem,0.8fr)_minmax(13rem,1fr)_auto] gap-4 bg-muted/60 px-4 py-3 text-xs font-black tracking-wide text-muted-foreground uppercase lg:grid">
            <span>Player</span>
            <span>Role</span>
            <span>Progress</span>
            <span>Actions</span>
          </div>
          {users.map((user) => (
            <UserAdminTableRow key={user.id} user={user} currentUserId={currentUserId} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {users.map((user) => (
            <UserAdminCard key={user.id} user={user} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </section>
  );
}
