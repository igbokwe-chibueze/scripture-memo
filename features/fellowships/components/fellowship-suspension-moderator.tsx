"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldAlertIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/shared/loading-button";
import { resolveFellowshipSuspensionAppealAction } from "@/features/fellowships/actions/resolve-fellowship-suspension-appeal.action";
import { restoreFellowshipSuspensionAction } from "@/features/fellowships/actions/restore-fellowship-suspension.action";
import { suspendFellowshipAction } from "@/features/fellowships/actions/suspend-fellowship.action";
import type { FellowshipModerationItem } from "@/features/fellowships/types/fellowship.types";

/**
 * Renders the Super Admin's reasoned suspension lifecycle for one Fellowship.
 * The suspend form requires exact-name confirmation and reauthentication; the
 * active-case branch exposes the appeal and only offers decision controls to a
 * non-conflicted viewer for usability. Server Actions and repository checks
 * remain the security boundary. No form state persists after navigation.
 */
export function FellowshipSuspensionModerator({
  fellowship,
  viewerId,
}: Readonly<{
  fellowship: FellowshipModerationItem;
  viewerId: string;
}>): React.ReactNode {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const suspension = fellowship.suspension;

  /** Shares pending and toast behavior while leaving authorization server-side. */
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
        toast.error("The suspension action could not be completed. Please try again.", {
          duration: Infinity,
        });
      }
    });
  };

  if (!suspension || suspension.status !== "ACTIVE") {
    return (
      <form
        action={(formData) => {
          runAction(() =>
            suspendFellowshipAction({
              fellowshipId: fellowship.id,
              confirmationName: String(formData.get("suspensionName") ?? ""),
              reason: String(formData.get("suspensionReason") ?? ""),
              password: String(formData.get("suspensionPassword") ?? ""),
            }),
          );
        }}
        className="space-y-3 rounded-2xl border border-amber-500/30 p-4"
      >
        <div className="flex items-center gap-2">
          <ShieldAlertIcon className="size-5 text-amber-600" aria-hidden="true" />
          <h3 className="font-heading font-bold">Suspend Fellowship</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Hides the Fellowship from discovery and blocks joins, invites, edits,
          and leadership changes. Members retain read access. The current leader
          may submit one appeal within 30 days.
        </p>
        <div className="space-y-2">
          <Label htmlFor={`suspend-name-${fellowship.id}`}>
            Type the Fellowship name: {fellowship.name}
          </Label>
          <Input
            id={`suspend-name-${fellowship.id}`}
            name="suspensionName"
            required
            maxLength={50}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`suspend-reason-${fellowship.id}`}>Reason for suspension</Label>
          <Input
            id={`suspend-reason-${fellowship.id}`}
            name="suspensionReason"
            required
            minLength={15}
            maxLength={500}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`suspend-password-${fellowship.id}`}>Confirm with your password</Label>
          <Input
            id={`suspend-password-${fellowship.id}`}
            name="suspensionPassword"
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
          pendingLabel="Suspending"
          className="w-full"
        >
          Suspend Fellowship
        </LoadingButton>
      </form>
    );
  }

  const appeal = suspension.appeal;
  const reviewerConflict = Boolean(
    appeal?.status === "PENDING" &&
      (viewerId === suspension.suspendedById || viewerId === appeal.appellantId),
  );

  return (
    <section className="space-y-4 rounded-2xl border border-destructive/30 p-4">
      <div>
        <h3 className="font-heading font-bold">Active suspension</h3>
        <p className="mt-1 text-sm text-muted-foreground">{suspension.reason}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Issued by {suspension.suspendedByDisplayName}. Appeal deadline:{" "}
          {suspension.appealDeadline.toLocaleDateString()}.
        </p>
      </div>

      {appeal?.status === "PENDING" ? (
        <div className="space-y-3 rounded-xl bg-muted/60 p-4">
          <h4 className="font-bold">Appeal from {appeal.appellantDisplayName}</h4>
          <p className="whitespace-pre-wrap text-sm">{appeal.statement}</p>
          {reviewerConflict ? (
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              You cannot review an appeal you submitted or the suspension you
              issued. Another Super Admin must decide it.
            </p>
          ) : (
            <form
              action={(formData) => {
                runAction(() =>
                  resolveFellowshipSuspensionAppealAction({
                    suspensionId: suspension.id,
                    decision: String(formData.get("appealDecision") ?? ""),
                    decisionReason: String(formData.get("decisionReason") ?? ""),
                    password: String(formData.get("reviewPassword") ?? ""),
                  }),
                );
              }}
              className="space-y-3"
            >
              <div className="space-y-2">
                <Label htmlFor={`appeal-decision-${fellowship.id}`}>
                  Decision
                </Label>
                <select
                  id={`appeal-decision-${fellowship.id}`}
                  name="appealDecision"
                  defaultValue="RESTORE"
                  className="min-h-11 w-full rounded-xl border bg-background px-3"
                >
                  <option value="RESTORE">Restore Fellowship</option>
                  <option value="UPHOLD">Uphold suspension (final)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`appeal-reason-${fellowship.id}`}>Decision reason</Label>
                <Input
                  id={`appeal-reason-${fellowship.id}`}
                  name="decisionReason"
                  required
                  minLength={15}
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`appeal-password-${fellowship.id}`}>Confirm with your password</Label>
                <Input
                  id={`appeal-password-${fellowship.id}`}
                  name="reviewPassword"
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
                pendingLabel="Recording decision"
                className="w-full"
              >
                Record appeal decision
              </LoadingButton>
            </form>
          )}
        </div>
      ) : appeal?.status === "UPHELD" ? (
        <div className="rounded-xl bg-muted/60 p-4">
          <p className="font-bold">Appeal denied; the suspension is final.</p>
          {appeal.decisionReason && (
            <p className="mt-2 text-sm">{appeal.decisionReason}</p>
          )}
        </div>
      ) : (
        <form
          action={(formData) => {
            runAction(() =>
              restoreFellowshipSuspensionAction({
                suspensionId: suspension.id,
                reason: String(formData.get("restorationReason") ?? ""),
                password: String(formData.get("restorationPassword") ?? ""),
              }),
            );
          }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">
            No appeal is awaiting review. Restore only with a documented reason.
          </p>
          <div className="space-y-2">
            <Label htmlFor={`restore-reason-${fellowship.id}`}>Reason for restoration</Label>
            <Input
              id={`restore-reason-${fellowship.id}`}
              name="restorationReason"
              required
              minLength={15}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`restore-password-${fellowship.id}`}>Confirm with your password</Label>
            <Input
              id={`restore-password-${fellowship.id}`}
              name="restorationPassword"
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
            pendingLabel="Restoring"
            className="w-full"
          >
            Restore Fellowship
          </LoadingButton>
        </form>
      )}
    </section>
  );
}
