"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlertIcon, UsersRoundIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/shared/loading-button";
import {
  emergencyDissolveFellowshipAction,
  emergencyTransferLeadershipAction,
} from "@/features/fellowships/actions/emergency-fellowship-actions.action";
import type { FellowshipModerationItem } from "@/features/fellowships/types/fellowship.types";

/**
 * Gives Super Admins bounded, reasoned recovery controls for each result.
 * These actions never hard-delete Fellowship rows or member learning history.
 */
export function FellowshipModerationManager({
  fellowships,
}: Readonly<{ fellowships: FellowshipModerationItem[] }>): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string>>(
    Object.fromEntries(
      fellowships.map((fellowship) => [
        fellowship.id,
        fellowship.transferCandidates[0]?.membershipId ?? "",
      ]),
    ),
  );

  /** Shares feedback and refresh behavior, not authorization. */
  const runAction = (
    operation: () => Promise<{ success: boolean; message: string }>,
  ): void => {
    startTransition(async () => {
      try {
        const result = await operation();
        if (!result.success) {
          toast.error(result.message, { duration: Infinity });
          return;
        }
        toast.success(result.message);
        router.refresh();
      } catch {
        toast.error(
          "The moderation action could not be completed. Please try again.",
          { duration: Infinity },
        );
      }
    });
  };

  if (fellowships.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center text-muted-foreground">
        No Fellowships match this search.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fellowships.map((fellowship) => {
        const governanceLocked =
          fellowship.closure?.status === "FORCED" ||
          fellowship.closure?.status === "SCHEDULED";

        return (
          <article
            key={fellowship.id}
            className="rounded-3xl border bg-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-heading text-xl font-bold">
                  {fellowship.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Leader: {fellowship.leaderDisplayName} · {fellowship.memberCount} members ·{" "}
                  {fellowship.isPublic ? "Public" : "Private"}
                </p>
              </div>
              {fellowship.closure && (
                <span className="rounded-full bg-amber-500/12 px-3 py-1 text-xs font-bold">
                  {fellowship.closure.status === "FORCED"
                    ? "Emergency closed"
                    : fellowship.closure.status === "CANCELLED"
                      ? "Previously restored"
                      : fellowship.closure.cancellationDeadline &&
                          fellowship.closure.cancellationDeadline > new Date()
                        ? "Closing · recovery period"
                        : "Closed"}
                </span>
              )}
            </div>

            {governanceLocked ? (
              <p className="mt-5 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                This Fellowship is closed or in its recovery period. Recovery
                actions are unavailable.
              </p>
            ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <form
                  action={(formData) => {
                    const reason = String(
                      formData.get("transferReason") ?? "",
                    );
                    const confirmationName = String(
                      formData.get("transferName") ?? "",
                    );
                    const password = String(
                      formData.get("transferPassword") ?? "",
                    );
                    runAction(() =>
                      emergencyTransferLeadershipAction({
                        fellowshipId: fellowship.id,
                        targetMemberId: selectedMembers[fellowship.id] ?? "",
                        confirmationName,
                        password,
                        reason,
                      }),
                    );
                  }}
                  className="space-y-3 rounded-2xl border p-4"
                >
                  <div className="flex items-center gap-2">
                    <UsersRoundIcon
                      className="size-5 text-primary"
                      aria-hidden="true"
                    />
                    <h3 className="font-heading font-bold">
                      Emergency leadership transfer
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use when the current leader is inaccessible or the community
                    requires recovery.
                  </p>
                  {fellowship.transferCandidates.length > 0 ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor={`moderation-member-${fellowship.id}`}>
                          New leader
                        </Label>
                        <select
                          id={`moderation-member-${fellowship.id}`}
                          name="targetMemberId"
                          required
                          value={selectedMembers[fellowship.id] ?? ""}
                          onChange={(event) =>
                            setSelectedMembers((current) => ({
                              ...current,
                              [fellowship.id]: event.currentTarget.value,
                            }))
                          }
                          className="min-h-11 w-full rounded-xl border bg-background px-3"
                        >
                          {fellowship.transferCandidates.map((member) => (
                            <option
                              key={member.membershipId}
                              value={member.membershipId}
                            >
                              {member.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor={`moderation-transfer-name-${fellowship.id}`}
                        >
                          Type the Fellowship name: {fellowship.name}
                        </Label>
                        <Input
                          id={`moderation-transfer-name-${fellowship.id}`}
                          name="transferName"
                          required
                          maxLength={50}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor={`moderation-transfer-reason-${fellowship.id}`}
                        >
                          Reason for recovery
                        </Label>
                        <Input
                          id={`moderation-transfer-reason-${fellowship.id}`}
                          name="transferReason"
                          required
                          minLength={15}
                          maxLength={500}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor={`moderation-transfer-password-${fellowship.id}`}
                        >
                          Confirm with your password
                        </Label>
                        <Input
                          id={`moderation-transfer-password-${fellowship.id}`}
                          name="transferPassword"
                          type="password"
                          required
                          maxLength={128}
                          autoComplete="current-password"
                        />
                      </div>
                      <LoadingButton
                        type="submit"
                        disabled={isPending}
                        isPending={isPending}
                        pendingLabel="Transferring leadership"
                        className="w-full"
                      >
                        Transfer leadership
                      </LoadingButton>
                    </>
                  ) : (
                    <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                      A transfer needs at least one current member other than the
                      leader.
                    </p>
                  )}
                </form>

                <form
                  action={(formData) => {
                    const reason = String(formData.get("closeReason") ?? "");
                    const confirmationName = String(
                      formData.get("closeName") ?? "",
                    );
                    const password = String(
                      formData.get("closePassword") ?? "",
                    );
                    runAction(() =>
                      emergencyDissolveFellowshipAction({
                        fellowshipId: fellowship.id,
                        confirmationName,
                        password,
                        reason,
                      }),
                    );
                  }}
                  className="space-y-3 rounded-2xl border border-destructive/25 p-4"
                >
                  <div className="flex items-center gap-2">
                    <ShieldAlertIcon
                      className="size-5 text-destructive"
                      aria-hidden="true"
                    />
                    <h3 className="font-heading font-bold">Emergency closure</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Closes immediately, disables discovery and invitations, and
                    preserves all records. This cannot be undone.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor={`moderation-close-name-${fellowship.id}`}>
                      Type the Fellowship name: {fellowship.name}
                    </Label>
                    <Input
                      id={`moderation-close-name-${fellowship.id}`}
                      name="closeName"
                      required
                      maxLength={50}
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`moderation-close-reason-${fellowship.id}`}>
                      Reason for emergency closure
                    </Label>
                    <Input
                      id={`moderation-close-reason-${fellowship.id}`}
                      name="closeReason"
                      required
                      minLength={15}
                      maxLength={500}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`moderation-close-password-${fellowship.id}`}>
                      Confirm with your password
                    </Label>
                    <Input
                      id={`moderation-close-password-${fellowship.id}`}
                      name="closePassword"
                      type="password"
                      required
                      maxLength={128}
                      autoComplete="current-password"
                    />
                  </div>
                  <LoadingButton
                    type="submit"
                    variant="destructive"
                    disabled={isPending}
                    isPending={isPending}
                    pendingLabel="Closing fellowship"
                    className="w-full"
                  >
                    Close fellowship now
                  </LoadingButton>
                </form>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
