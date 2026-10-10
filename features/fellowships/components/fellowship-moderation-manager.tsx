"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  LockKeyholeIcon,
  ShieldAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/shared/loading-button";
import { NavigationButton } from "@/components/shared/navigation-button";
import {
  emergencyDissolveFellowshipAction,
  emergencyTransferLeadershipAction,
} from "@/features/fellowships/actions/emergency-fellowship-actions.action";
import { getFellowshipModerationDetailAction } from "@/features/fellowships/actions/get-fellowship-moderation-detail.action";
import { FellowshipSuspensionModerator } from "@/features/fellowships/components/fellowship-suspension-moderator";
import type {
  FellowshipModerationItem,
  FellowshipModerationListItem,
  FellowshipModerationPage,
  FellowshipModerationStatus,
  FellowshipGovernanceHistoryEvent,
} from "@/features/fellowships/types/fellowship.types";
import { cn } from "@/lib/utils";

type ManagementSection = "overview" | "transfer" | "safety" | "closure";

const STATUS_LABELS: Record<
  Exclude<FellowshipModerationStatus, "ALL">,
  string
> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  APPEAL_PENDING: "Appeal needs review",
  CLOSING: "Closing · recovery period",
  CLOSED: "Closed",
};

const STATUS_STYLES: Record<
  Exclude<FellowshipModerationStatus, "ALL">,
  string
> = {
  ACTIVE: "border-success-border/25 bg-success-subtle text-success-text dark:text-success-text",
  SUSPENDED: "border-reward-border/30 bg-reward-subtle text-reward-text dark:text-reward-text",
  APPEAL_PENDING: "border-selection-border/30 bg-selection-subtle text-selection-text dark:text-selection-text",
  CLOSING: "border-decoration-border/30 bg-decoration-subtle text-decoration-text dark:text-decoration-text",
  CLOSED: "border-border bg-muted text-muted-foreground",
};

/** Renders the compact result list and stable server-side pagination controls. */
export function FellowshipModerationManager({
  data,
  query,
  status,
  viewerId,
  canManage,
}: Readonly<{
  data: FellowshipModerationPage;
  query: string;
  status: FellowshipModerationStatus;
  viewerId: string;
  canManage: boolean;
}>): React.ReactNode {
  const firstResult = data.totalCount === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const lastResult = Math.min(data.page * data.pageSize, data.totalCount);

  return (
    <section className="space-y-4" aria-label="Fellowship results">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p aria-live="polite" className="font-bold text-muted-foreground">
          {data.totalCount === 0
            ? "No Fellowships found"
            : `Showing ${firstResult}–${lastResult} of ${data.totalCount} Fellowships`}
        </p>
        <p className="text-muted-foreground">Sorted by recent activity</p>
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card px-5 py-10 text-center">
          <UsersRoundIcon className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 font-heading text-lg font-bold">No matching Fellowships</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different name, leader, or status filter.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <table className="w-full table-fixed border-collapse text-left text-sm md:table-auto">
              <thead className="hidden bg-muted/60 text-xs font-bold uppercase tracking-wide text-muted-foreground md:table-header-group">
                <tr>
                  <th scope="col" className="px-5 py-3">Fellowship</th>
                  <th scope="col" className="px-4 py-3">Leader</th>
                  <th scope="col" className="px-4 py-3">Members</th>
                  <th scope="col" className="px-4 py-3">Visibility</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Updated</th>
                  {canManage && (
                    <th scope="col" className="px-4 py-3 text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((fellowship) => (
                  <tr key={fellowship.id} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                    <td className="w-[calc(100%-3.5rem)] px-3 py-3 md:w-auto md:px-5 md:py-4">
                      <span className="block truncate font-heading font-bold md:max-w-64">
                        {fellowship.name}
                      </span>
                      <div className="mt-1.5 space-y-1.5 md:hidden">
                        <p className="truncate text-xs text-muted-foreground">
                          {fellowship.leaderDisplayName} · {fellowship.memberCount} members ·{" "}
                          {fellowship.isPublic ? "Public" : "Private"}
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <StatusBadge status={fellowship.status} />
                          <time
                            dateTime={fellowship.updatedAt.toISOString()}
                            className="text-xs text-muted-foreground"
                          >
                            {fellowship.updatedAt.toLocaleDateString()}
                          </time>
                        </div>
                      </div>
                    </td>
                    <td className="hidden max-w-48 truncate px-4 py-4 md:table-cell">
                      {fellowship.leaderDisplayName}
                    </td>
                    <td className="hidden px-4 py-4 tabular-nums md:table-cell">{fellowship.memberCount}</td>
                    <td className="hidden px-4 py-4 md:table-cell">
                      {fellowship.isPublic ? "Public" : "Private"}
                    </td>
                    <td className="hidden px-4 py-4 md:table-cell">
                      <StatusBadge status={fellowship.status} />
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-muted-foreground md:table-cell">
                      <time dateTime={fellowship.updatedAt.toISOString()}>
                        {fellowship.updatedAt.toLocaleDateString()}
                      </time>
                    </td>
                    {canManage && (
                      <td className="w-14 px-1 py-3 text-right align-top md:w-auto md:px-4 md:align-middle">
                        <FellowshipRowActions
                          fellowship={fellowship}
                          viewerId={viewerId}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.totalCount > 0 && (
        <nav
          aria-label="Fellowship result pages"
          className="flex items-center justify-between gap-3 border-t pt-4"
        >
          <NavigationButton
            href={pageHref(query, status, Math.max(1, data.page - 1))}
            pendingLabel="Loading previous page"
            variant="outline"
            className={cn("min-h-11", data.page <= 1 && "pointer-events-none opacity-50")}
            aria-disabled={data.page <= 1}
            tabIndex={data.page <= 1 ? -1 : undefined}
          >
            <ArrowLeftIcon aria-hidden="true" />
            <span className="hidden sm:inline">Previous</span>
          </NavigationButton>
          <span className="text-sm font-bold tabular-nums">
            Page {data.page} of {data.totalPages}
          </span>
          <NavigationButton
            href={pageHref(query, status, Math.min(data.totalPages, data.page + 1))}
            pendingLabel="Loading next page"
            variant="outline"
            className={cn("min-h-11", data.page >= data.totalPages && "pointer-events-none opacity-50")}
            aria-disabled={data.page >= data.totalPages}
            tabIndex={data.page >= data.totalPages ? -1 : undefined}
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowRightIcon aria-hidden="true" />
          </NavigationButton>
        </nav>
      )}

    </section>
  );
}

function StatusBadge({
  status,
}: Readonly<{
  status: FellowshipModerationListItem["status"];
}>): React.ReactNode {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold leading-tight",
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Builds a filter-preserving URL for each pagination control. */
function pageHref(
  query: string,
  status: FellowshipModerationStatus,
  page: number,
): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status !== "ALL") params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin/fellowships?${search}` : "/admin/fellowships";
}

/** Opens a row-scoped management dialog and fetches its full data on demand. */
function FellowshipRowActions({
  fellowship,
  viewerId,
}: Readonly<{
  fellowship: FellowshipModerationListItem;
  viewerId: string;
}>): React.ReactNode {
  const router = useRouter();
  const [detail, setDetail] = useState<FellowshipModerationItem | null>(null);
  const [section, setSection] = useState<ManagementSection>("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function openManagement(nextSection: ManagementSection): void {
    setDialogOpen(true);
    setDetail(null);
    setSection(nextSection);
    startTransition(async () => {
      try {
        const result = await getFellowshipModerationDetailAction({
          fellowshipId: fellowship.id,
        });
        if (!result.success) {
          toast.error(result.message, { duration: Infinity });
          setDialogOpen(false);
          return;
        }
        if (!result.data) {
          toast.error("Fellowship details were empty. Refresh and try again.", {
            duration: Infinity,
          });
          setDialogOpen(false);
          return;
        }
        setDetail(result.data);
      } catch {
        toast.error("Fellowship details could not be loaded. Try again.", {
          duration: Infinity,
        });
        setDialogOpen(false);
      }
    });
  }

  function runAction(
    operation: () => Promise<{ success: boolean; message: string }>,
  ): void {
    startTransition(async () => {
      try {
        const result = await operation();
        if (!result.success) {
          toast.error(result.message, { duration: Infinity });
          return;
        }
        toast.success(result.message);
        setDialogOpen(false);
        setDetail(null);
        router.refresh();
      } catch {
        toast.error("The moderation action could not be completed. Try again.", {
          duration: Infinity,
        });
      }
    });
  }

  const reviewAppeal = fellowship.status === "APPEAL_PENDING";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-11")}
          aria-label={`Open actions for ${fellowship.name}`}
          disabled={isPending}
        >
          <EllipsisVerticalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-xl p-2">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2 py-1.5 font-bold">
              {fellowship.name}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11 cursor-pointer gap-3 px-3 font-bold"
            onClick={() => openManagement("overview")}
          >
            <UsersRoundIcon aria-hidden="true" />
            Manage Fellowship
          </DropdownMenuItem>
          {reviewAppeal && (
            <DropdownMenuItem
              className="min-h-11 cursor-pointer gap-3 px-3 font-bold text-selection-text focus:text-selection-text dark:text-selection-text"
              onClick={() => openManagement("safety")}
            >
              <AlertTriangleIcon aria-hidden="true" />
              Review appeal
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setDialogOpen(false);
            setDetail(null);
          }
        }}
      >
        <DialogContent className="top-auto bottom-0 left-0 max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 gap-5 overflow-y-auto rounded-t-[1.75rem] rounded-b-none p-5 pt-10 transition-transform duration-300 ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6 sm:data-starting-style:-translate-y-1/2 sm:data-ending-style:-translate-y-1/2">
          {detail ? (
            <>
              <DialogHeader className="pr-12">
                <DialogTitle className="font-heading text-xl sm:text-2xl">
                  {detail.name}
                </DialogTitle>
                <DialogDescription>
                  {detail.leaderDisplayName} · {detail.memberCount} members ·{" "}
                  {detail.isPublic ? "Public" : "Private"}
                </DialogDescription>
              </DialogHeader>
              <ManagementNavigation
                detail={detail}
                section={section}
                onChange={setSection}
              />
              <ManagementContent
                detail={detail}
                section={section}
                viewerId={viewerId}
                isPending={isPending}
                runAction={runAction}
                onComplete={() => {
                  setDialogOpen(false);
                  setDetail(null);
                  router.refresh();
                }}
              />
            </>
          ) : (
            <div className="grid min-h-48 place-items-center text-sm font-bold text-muted-foreground" aria-live="polite">
              Loading Fellowship details…
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ManagementNavigation({
  detail,
  section,
  onChange,
}: Readonly<{
  detail: FellowshipModerationItem;
  section: ManagementSection;
  onChange: (section: ManagementSection) => void;
}>): React.ReactNode {
  const governanceLocked = isGovernanceLocked(detail);
  const options: Array<{ id: ManagementSection; label: string; disabled?: boolean }> = [
    { id: "overview", label: "Overview" },
    { id: "transfer", label: "Transfer", disabled: governanceLocked },
    {
      id: "safety",
      label: detail.suspension?.status === "ACTIVE" ? "Suspension" : "Safety",
      disabled: governanceLocked && detail.suspension?.status !== "ACTIVE",
    },
    { id: "closure", label: "Closure", disabled: governanceLocked },
  ];

  return (
    <nav
      aria-label="Fellowship management"
      className="grid grid-cols-2 gap-1.5 rounded-2xl border bg-muted/60 p-1.5 sm:grid-cols-4"
    >
      {options.map((option) => (
        <Button
          key={option.id}
          type="button"
          variant={section === option.id ? "outline" : "ghost"}
          className="min-h-11 px-3"
          disabled={option.disabled}
          aria-current={section === option.id ? "page" : undefined}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </nav>
  );
}

function ManagementContent({
  detail,
  section,
  viewerId,
  isPending,
  runAction,
  onComplete,
}: Readonly<{
  detail: FellowshipModerationItem;
  section: ManagementSection;
  viewerId: string;
  isPending: boolean;
  runAction: (
    operation: () => Promise<{ success: boolean; message: string }>,
  ) => void;
  onComplete: () => void;
}>): React.ReactNode {
  if (section === "overview") {
    return <FellowshipOverview detail={detail} />;
  }

  if (section === "safety") {
    return (
      <FellowshipSuspensionModerator
        fellowship={detail}
        viewerId={viewerId}
        onComplete={onComplete}
      />
    );
  }

  if (section === "transfer") {
    return (
      <LeadershipTransferForm
        detail={detail}
        isPending={isPending}
        runAction={runAction}
      />
    );
  }

  return (
    <EmergencyClosureForm
      detail={detail}
      isPending={isPending}
      runAction={runAction}
    />
  );
}

function FellowshipOverview({ detail }: Readonly<{
  detail: FellowshipModerationItem;
}>): React.ReactNode {
  const latestClosure = detail.closure;
  const latestSuspension = detail.suspension;
  const governanceLocked = isGovernanceLocked(detail);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Current status
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {latestSuspension?.status === "ACTIVE" ? (
            <StatusBadge
              status={latestSuspension.appeal?.status === "PENDING" ? "APPEAL_PENDING" : "SUSPENDED"}
            />
          ) : latestClosure?.status === "FORCED" || latestClosure?.status === "SCHEDULED" ? (
            <StatusBadge
              status={
                latestClosure.status === "SCHEDULED" &&
                latestClosure.cancellationDeadline &&
                latestClosure.cancellationDeadline > new Date()
                  ? "CLOSING"
                  : "CLOSED"
              }
            />
          ) : (
            <StatusBadge status="ACTIVE" />
          )}
          <span className="text-sm text-muted-foreground">
            {detail.memberCount} members · {detail.isPublic ? "Public" : "Private"}
          </span>
        </div>
      </div>

      {latestSuspension?.status === "ACTIVE" && (
        <div className="rounded-xl border border-reward-border/25 bg-reward-subtle p-4">
          <div className="flex gap-3">
            <ShieldAlertIcon className="mt-0.5 size-5 shrink-0 text-reward-text dark:text-reward-text" aria-hidden="true" />
            <div>
              <h3 className="font-bold">Active suspension</h3>
              <p className="mt-1 text-sm text-muted-foreground">{latestSuspension.reason}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Appeal deadline {latestSuspension.appealDeadline.toLocaleDateString()}.
              </p>
            </div>
          </div>
        </div>
      )}

      {latestClosure && latestClosure.status !== "CANCELLED" && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <h3 className="font-bold">Closure record</h3>
          <p className="mt-1 text-sm text-muted-foreground">{latestClosure.reason}</p>
          {latestClosure.cancellationDeadline && (
            <p className="mt-2 text-xs text-muted-foreground">
              Recovery deadline {latestClosure.cancellationDeadline.toLocaleDateString()}.
            </p>
          )}
        </div>
      )}

      {detail.governanceHistory.length > 0 && (
        <section className="space-y-2" aria-label="Recent governance history">
          <h3 className="font-heading font-bold">Recent governance history</h3>
          <ol className="divide-y rounded-xl border bg-card">
            {detail.governanceHistory.map((event, index) => (
              <li
                key={`${event.kind}-${event.createdAt.toISOString()}-${index}`}
                className="space-y-1.5 p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-bold">
                    {historyEventLabel(event.kind, event.status)}
                  </p>
                  <time
                    dateTime={event.createdAt.toISOString()}
                    className="text-xs text-muted-foreground"
                  >
                    {event.createdAt.toLocaleDateString()}
                  </time>
                </div>
                <p className="text-xs text-muted-foreground">
                  {event.actorDisplayName}
                  {event.targetDisplayName ? ` → ${event.targetDisplayName}` : ""}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-primary">
                    {event.caseNumber}
                  </p>
                  <NavigationButton
                    href={buildCaseViewHref(detail.id, event)}
                    pendingLabel="Opening case"
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                  >
                    <EyeIcon aria-hidden="true" />
                    View
                  </NavigationButton>
                </div>
                {event.reason && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {event.reason}
                  </p>
                )}
              </li>
            ))}
          </ol>
          {detail.totalGovernanceLogCount > detail.governanceHistory.length && (
            <NavigationButton
              href={`/admin/fellowship-cases?fellowshipId=${encodeURIComponent(
                detail.id,
              )}&query=${encodeURIComponent(detail.name)}`}
              pendingLabel="Opening Fellowship case logs"
              variant="outline"
              className="w-full"
            >
              See more case logs
            </NavigationButton>
          )}
        </section>
      )}

      <div className="flex gap-3 rounded-xl border border-border/70 p-4 text-sm text-muted-foreground">
        <LockKeyholeIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Sensitive actions require a reason and password confirmation. Each decision is recorded in the audit log.
          {governanceLocked && " Governance actions are currently limited by this Fellowship’s status."}
        </p>
      </div>
    </section>
  );
}

function historyEventLabel(
  kind: FellowshipModerationItem["governanceHistory"][number]["kind"],
  status: string,
): string {
  const eventName =
    kind === "LEADERSHIP_TRANSFER"
      ? "Leadership transfer"
      : kind === "CLOSURE"
        ? "Closure"
        : kind === "SUSPENSION"
          ? "Suspension"
          : "Appeal";
  const readableStatus = status.toLowerCase().replaceAll("_", " ");
  return `${eventName} · ${readableStatus}`;
}

/** Builds a case-register URL with exact Fellowship, case, type, and status filters. */
function buildCaseViewHref(
  fellowshipId: string,
  event: FellowshipGovernanceHistoryEvent,
): string {
  const caseKind =
    event.kind === "LEADERSHIP_TRANSFER"
      ? "TRANSFER"
      : event.kind === "CLOSURE"
        ? "CLOSURE"
        : "SUSPENSION";
  const filters = new URLSearchParams({
    fellowshipId,
    query: event.caseNumber,
    kind: caseKind,
    status: event.caseStatus,
  });

  return `/admin/fellowship-cases?${filters.toString()}`;
}

function LeadershipTransferForm({
  detail,
  isPending,
  runAction,
}: Readonly<{
  detail: FellowshipModerationItem;
  isPending: boolean;
  runAction: (
    operation: () => Promise<{ success: boolean; message: string }>,
  ) => void;
}>): React.ReactNode {
  return (
    <form
      action={(formData) => {
        runAction(() =>
          emergencyTransferLeadershipAction({
            fellowshipId: detail.id,
            targetMemberId: String(formData.get("targetMemberId") ?? ""),
            confirmationName: String(formData.get("confirmationName") ?? ""),
            password: String(formData.get("password") ?? ""),
            reason: String(formData.get("reason") ?? ""),
          }),
        );
      }}
      className="space-y-4 rounded-xl border p-4"
    >
      <div className="flex gap-3">
        <UsersRoundIcon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h3 className="font-heading font-bold">Transfer leadership</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a current member. The previous leader remains a member, and the transfer is audited.
          </p>
        </div>
      </div>
      {detail.transferCandidates.length > 0 ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`transfer-member-${detail.id}`}>New leader</Label>
            <select
              id={`transfer-member-${detail.id}`}
              name="targetMemberId"
              required
              defaultValue={detail.transferCandidates[0]?.membershipId ?? ""}
              className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {detail.transferCandidates.map((member) => (
                <option key={member.membershipId} value={member.membershipId}>
                  {member.displayName}
                </option>
              ))}
            </select>
          </div>
          <ConfirmationFields detail={detail} kind="transfer" />
          <LoadingButton
            type="submit"
            className="min-h-11 w-full sm:w-auto"
            isPending={isPending}
            pendingLabel="Transferring leadership"
          >
            Transfer leadership
          </LoadingButton>
        </>
      ) : (
        <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
          A transfer needs at least one current member other than the leader.
        </p>
      )}
    </form>
  );
}

function EmergencyClosureForm({
  detail,
  isPending,
  runAction,
}: Readonly<{
  detail: FellowshipModerationItem;
  isPending: boolean;
  runAction: (
    operation: () => Promise<{ success: boolean; message: string }>,
  ) => void;
}>): React.ReactNode {
  return (
    <form
      action={(formData) => {
        runAction(() =>
          emergencyDissolveFellowshipAction({
            fellowshipId: detail.id,
            confirmationName: String(formData.get("confirmationName") ?? ""),
            password: String(formData.get("password") ?? ""),
            reason: String(formData.get("reason") ?? ""),
          }),
        );
      }}
      className="space-y-4 rounded-xl border border-destructive/25 p-4"
    >
      <div className="flex gap-3">
        <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <h3 className="font-heading font-bold">Close Fellowship immediately</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This is an emergency closure. It disables discovery and invitations, preserves records, and cannot be undone.
          </p>
        </div>
      </div>
      <ConfirmationFields detail={detail} kind="closure" />
      <LoadingButton
        type="submit"
        variant="destructive"
        className="min-h-11 w-full sm:w-auto"
        isPending={isPending}
        pendingLabel="Closing Fellowship"
      >
        Close Fellowship now
      </LoadingButton>
    </form>
  );
}

function ConfirmationFields({
  detail,
  kind,
}: Readonly<{
  detail: FellowshipModerationItem;
  kind: "transfer" | "closure";
}>): React.ReactNode {
  const idPrefix = `${kind}-${detail.id}`;
  const labels = kind === "transfer"
    ? { reason: "Reason for recovery", reasonName: "reason" }
    : { reason: "Reason for emergency closure", reasonName: "reason" };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-name`}>
          Type the Fellowship name: {detail.name}
        </Label>
        <Input
          id={`${idPrefix}-name`}
          name="confirmationName"
          required
          maxLength={50}
          autoComplete="off"
          className="min-h-11"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-reason`}>{labels.reason}</Label>
        <Input
          id={`${idPrefix}-reason`}
          name={labels.reasonName}
          required
          minLength={15}
          maxLength={500}
          className="min-h-11"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-password`}>Confirm with your password</Label>
        <Input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          required
          maxLength={128}
          autoComplete="current-password"
          className="min-h-11"
        />
      </div>
    </div>
  );
}

function isGovernanceLocked(detail: FellowshipModerationItem): boolean {
  return (
    detail.closure?.status === "FORCED" ||
    detail.closure?.status === "SCHEDULED" ||
    detail.suspension?.status === "ACTIVE"
  );
}
