"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { toast } from "sonner";
import { CrownIcon, HandshakeIcon, ShieldAlertIcon } from "lucide-react";
import { LoadingButton } from "@/components/shared/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelFellowshipDissolutionAction,
} from "@/features/fellowships/actions/cancel-fellowship-dissolution.action";
import {
  cancelLeadershipTransferAction,
} from "@/features/fellowships/actions/cancel-leadership-transfer.action";
import {
  requestLeadershipTransferAction,
} from "@/features/fellowships/actions/request-leadership-transfer.action";
import {
  respondLeadershipTransferAction,
} from "@/features/fellowships/actions/respond-leadership-transfer.action";
import {
  scheduleFellowshipDissolutionAction,
} from "@/features/fellowships/actions/schedule-fellowship-dissolution.action";
import { submitFellowshipSuspensionAppealAction } from "@/features/fellowships/actions/submit-fellowship-suspension-appeal.action";
import type { FellowshipGovernanceData } from "@/features/fellowships/types/fellowship.types";

/**
 * Renders leader-only handoff and closure controls plus recipient response.
 * Passwords are submitted only to Better Auth's server-side verifier and are
 * never retained in component state or returned in action results.
 */
export function FellowshipGovernancePanel({
  fellowshipId,
  fellowshipName,
  isLeader,
  governance,
  mode = "home",
}: Readonly<{
  fellowshipId: string;
  fellowshipName: string;
  isLeader: boolean;
  governance: FellowshipGovernanceData;
  mode?: "home" | "manage";
}>): React.ReactNode {
  const t = useTranslations("Fellowships.governance");
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedMemberId, setSelectedMemberId] = useState(
    governance.transferCandidates[0]?.membershipId ?? "",
  );

  /** Confirms Server Action outcomes and refreshes only after committed writes. */
  const runMutation = (
    operation: () => Promise<{ success: boolean; message: string }>,
    onSuccess?: () => void,
  ): void => {
    startTransition(async () => {
      try {
        const result = await operation();
        if (!result.success) {
          toast.error(result.message, { duration: Infinity });
          return;
        }
        toast.success(result.message);
        onSuccess?.();
        router.refresh();
      } catch {
        toast.error(t("unknownError"), { duration: Infinity });
      }
    });
  };

  const requestTransfer = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    runMutation(
      () =>
        requestLeadershipTransferAction({
          fellowshipId,
          targetMemberId: selectedMemberId,
          password: String(formData.get("currentPassword") ?? ""),
        }),
      () => form.reset(),
    );
  };

  const scheduleClosure = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    runMutation(
      () =>
        scheduleFellowshipDissolutionAction({
          fellowshipId,
          password: String(formData.get("closurePassword") ?? ""),
          confirmationName: String(formData.get("confirmationName") ?? ""),
        }),
      () => form.reset(),
    );
  };

  const submitAppeal = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    runMutation(
      () =>
        submitFellowshipSuspensionAppealAction({
          suspensionId: governance.suspension?.id ?? "",
          statement: String(formData.get("appealStatement") ?? ""),
        }),
      () => form.reset(),
    );
  };

  const hasHomeNotice =
    governance.isClosing ||
    governance.pendingTransfer !== null ||
    governance.suspension !== null;
  const showHomeClosure =
    mode === "home" && !governance.suspension && governance.isClosing;
  const showHomeTransfer =
    mode === "home" &&
    !governance.suspension &&
    !governance.isClosing &&
    governance.pendingTransfer !== null;
  const showManagePendingTransfer =
    mode === "manage" && governance.pendingTransfer !== null;
  const showManageControls =
    mode === "manage" && governance.pendingTransfer === null;

  if (mode === "home" && !hasHomeNotice) return null;
  if (mode === "manage" && !isLeader) return null;

  return (
    <section
      className="mt-6 space-y-4"
      aria-label={mode === "home" ? t("sectionTitle") : undefined}
      aria-labelledby={
        mode === "manage" ? "fellowship-leadership-controls-title" : undefined
      }
    >
      {mode === "manage" && (
        <h2
          id="fellowship-leadership-controls-title"
          className="font-heading text-2xl font-bold"
        >
          {t("sectionTitle")}
        </h2>
      )}
      {mode === "home" && governance.suspension && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldAlertIcon className="mt-1 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="font-heading text-lg font-bold">{t("suspensionTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("suspensionDescription")}</p>
              <p className="text-sm font-bold">{t("suspensionReason", { reason: governance.suspension.reason })}</p>
              <p className="text-sm">
                {t(
                  governance.suspension.appealDeadline > new Date()
                    ? "appealDeadline"
                    : "appealDeadlinePassed",
                  {
                    date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                      governance.suspension.appealDeadline,
                    ),
                  },
                )}
              </p>
              {governance.suspension.appeal ? (
                <div className="space-y-2 rounded-2xl bg-background/80 p-4">
                  <p className="font-bold">{t(`appeal${governance.suspension.appeal.status}`)}</p>
                  {isLeader && (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {governance.suspension.appeal.statement}
                    </p>
                  )}
                  {governance.suspension.appeal.decisionReason && (
                    <p className="text-sm">{t("appealDecisionReason", {
                      reason: governance.suspension.appeal.decisionReason,
                    })}</p>
                  )}
                </div>
              ) : isLeader && governance.suspension.appealDeadline > new Date() ? (
                <form onSubmit={submitAppeal} className="space-y-3 rounded-2xl bg-background/80 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="fellowship-suspension-appeal">{t("appealStatement")}</Label>
                    <textarea
                      id="fellowship-suspension-appeal"
                      name="appealStatement"
                      required
                      minLength={30}
                      maxLength={2_000}
                      className="min-h-32 w-full rounded-xl border bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </div>
                  <LoadingButton
                    type="submit"
                    disabled={isPending}
                    isPending={isPending}
                    pendingLabel={t("submittingAppeal")}
                  >
                    {t("submitAppeal")}
                  </LoadingButton>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {showHomeClosure && (
        <div className="rounded-3xl border border-reward-border/35 bg-reward-subtle p-5">
          <div className="flex items-start gap-3">
            <ShieldAlertIcon className="mt-1 size-5 shrink-0 text-reward-text dark:text-reward-text" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-bold">{t("closingTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("closingDescription")}</p>
              {governance.cancellationDeadline && (
                <p className="mt-2 text-sm font-bold">
                  {t("cancelBefore", {
                    date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                      governance.cancellationDeadline,
                    ),
                  })}
                </p>
              )}
              {isLeader && governance.pendingTransfer && (
                <p className="mt-2 text-sm font-bold">{t("transferCancelledByClosing")}</p>
              )}
              {isLeader && (
                <LoadingButton
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  isPending={isPending}
                  pendingLabel={t("restoring")}
                  onClick={() =>
                    governance.cancellationDeadline &&
                    runMutation(() =>
                      cancelFellowshipDissolutionAction({
                        dissolutionId: governance.dissolutionId ?? "",
                      }),
                    )
                  }
                  className="mt-4"
                >
                  {t("cancelClosure")}
                </LoadingButton>
              )}
            </div>
          </div>
        </div>
      )}

      {showHomeTransfer && governance.pendingTransfer && (
        <div className="rounded-3xl border border-selection-border/30 bg-selection-subtle p-5">
          <div className="flex items-start gap-3">
            <HandshakeIcon className="mt-1 size-5 shrink-0 text-selection-text" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-lg font-bold">
                {governance.pendingTransfer.isRecipient
                  ? t("offerTitle")
                  : t("offerWaitingTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {governance.pendingTransfer.isRecipient
                  ? t("offerDescription", { fellowship: fellowshipName })
                  : t("offerWaitingDescription", {
                      member: governance.pendingTransfer.targetDisplayName,
                    })}
              </p>
              {governance.pendingTransfer.isRecipient ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <LoadingButton
                    type="button"
                    disabled={isPending}
                    isPending={isPending}
                    pendingLabel={t("accepting")}
                    onClick={() =>
                      runMutation(() =>
                        respondLeadershipTransferAction({
                          transferId: governance.pendingTransfer!.id,
                          response: "ACCEPT",
                        }),
                      )
                    }
                  >
                    {t("accept")}
                  </LoadingButton>
                  <LoadingButton
                    type="button"
                    variant="outline"
                    disabled={isPending}
                    isPending={isPending}
                    pendingLabel={t("declining")}
                    onClick={() =>
                      runMutation(() =>
                        respondLeadershipTransferAction({
                          transferId: governance.pendingTransfer!.id,
                          response: "DECLINE",
                        }),
                      )
                    }
                  >
                    {t("decline")}
                  </LoadingButton>
                </div>
              ) : (
                <LoadingButton
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  isPending={isPending}
                  pendingLabel={t("cancelling")}
                  onClick={() =>
                    runMutation(() =>
                      cancelLeadershipTransferAction({
                        transferId: governance.pendingTransfer!.id,
                      }),
                    )
                  }
                  className="mt-4"
                >
                  {t("cancelTransfer")}
                </LoadingButton>
              )}
            </div>
          </div>
        </div>
      )}

      {showManagePendingTransfer && governance.pendingTransfer && (
        <div className="rounded-3xl border border-selection-border/30 bg-selection-subtle p-5">
          <div className="flex items-start gap-3">
            <HandshakeIcon className="mt-1 size-5 shrink-0 text-selection-text" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="font-heading text-lg font-bold">{t("offerWaitingTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("offerWaitingDescription", {
                  member: governance.pendingTransfer.targetDisplayName,
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {showManageControls && (
        <div className="grid gap-4 lg:grid-cols-2">
          {governance.transferCandidates.length > 0 && (
            <form
              onSubmit={requestTransfer}
              className="space-y-4 rounded-3xl border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <CrownIcon className="size-5 text-reward-text" aria-hidden="true" />
                <h2 className="font-heading text-lg font-bold">{t("transferTitle")}</h2>
              </div>
              <p className="text-sm text-muted-foreground">{t("transferDescription")}</p>
              <div className="space-y-2">
                <Label htmlFor={`transfer-member-${fellowshipId}`}>{t("chooseMember")}</Label>
                <select
                  id={`transfer-member-${fellowshipId}`}
                  name="targetMemberId"
                  required
                  value={selectedMemberId}
                  onChange={(event) => setSelectedMemberId(event.currentTarget.value)}
                  className="min-h-11 w-full rounded-xl border bg-background px-3"
                >
                  {governance.transferCandidates.map((member) => (
                    <option key={member.membershipId} value={member.membershipId}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`transfer-password-${fellowshipId}`}>{t("currentPassword")}</Label>
                <Input
                  id={`transfer-password-${fellowshipId}`}
                  name="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                />
              </div>
              <LoadingButton
                type="submit"
                disabled={isPending || !selectedMemberId}
                isPending={isPending}
                pendingLabel={t("offering")}
                className="w-full"
              >
                {t("offerTransfer")}
              </LoadingButton>
            </form>
          )}

          <form
            onSubmit={scheduleClosure}
            className="space-y-4 rounded-3xl border border-destructive/25 bg-card p-5"
          >
            <div className="flex items-center gap-3">
              <ShieldAlertIcon className="size-5 text-destructive" aria-hidden="true" />
              <h2 className="font-heading text-lg font-bold">{t("closeTitle")}</h2>
            </div>
            <p className="text-sm text-muted-foreground">{t("closeDescription")}</p>
            <div className="space-y-2">
              <Label htmlFor={`closure-name-${fellowshipId}`}>
                {t("typeName", { fellowship: fellowshipName })}
              </Label>
              <Input
                id={`closure-name-${fellowshipId}`}
                name="confirmationName"
                autoComplete="off"
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`closure-password-${fellowshipId}`}>{t("currentPassword")}</Label>
              <Input
                id={`closure-password-${fellowshipId}`}
                name="closurePassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
              />
            </div>
            <LoadingButton
              type="submit"
              variant="destructive"
              disabled={isPending}
              isPending={isPending}
              pendingLabel={t("closing")}
              className="w-full"
            >
              {t("scheduleClosure")}
            </LoadingButton>
          </form>
        </div>
      )}
    </section>
  );
}
