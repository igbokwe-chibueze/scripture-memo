"use client";

/** Read-only discovery details; joining continues through the existing authorized actions. */
import { useFormatter, useTranslations } from "next-intl";
import { LockKeyholeIcon, UserPlusIcon, XIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingButton } from "@/components/shared/loading-button";
import { FellowshipInsignia } from "./fellowship-insignia";
import { getFellowshipInsignia } from "../constants/fellowship-insignias";
import type { FellowshipDiscoverySummary } from "../types/fellowship.types";

/**
 * Uses the directory's already-authorized metadata, so opening details has no
 * request latency or extra database reads. Shared Dialog owns focus/Escape and
 * dismissal; bounded content scrolls on small displays without clipping actions.
 */
export function FellowshipDiscoveryDialog({
  fellowship,
  onClose,
  onJoin,
  onRequest,
  onCancel,
  pending,
  activeMutation,
}: {
  fellowship: FellowshipDiscoverySummary | null;
  onClose: () => void;
  onJoin: (id: string) => void;
  onRequest: (id: string) => void;
  onCancel: (requestId: string) => void;
  pending: boolean;
  activeMutation: string | null;
}): React.ReactNode {
  const t = useTranslations("Fellowships");
  const format = useFormatter();
  const requestPending = fellowship?.requestStatus === "PENDING" && fellowship.requestId;

  return (
    <Dialog
      open={Boolean(fellowship)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {fellowship && (
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <FellowshipInsignia
              insigniaKey={fellowship.insigniaKey}
              label={t(getFellowshipInsignia(fellowship.insigniaKey).labelKey)}
              className="mb-2 size-20 rounded-2xl"
            />
            <DialogTitle className="pr-8 text-2xl leading-tight wrap-anywhere">
              {fellowship.name}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-wrap wrap-anywhere">
              {fellowship.description || t("noDescription")}
            </DialogDescription>
          </DialogHeader>

          <dl className="grid grid-cols-2 gap-3 rounded-card border bg-muted/50 p-3 text-sm">
            <div className="min-w-0">
              <dt className="text-muted-foreground">{t("discoveryDetails.founder")}</dt>
              <dd className="font-bold wrap-anywhere">
                {fellowship.founderDisplayName || t("discoveryDetails.unavailable")}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">{t("discoveryDetails.leader")}</dt>
              <dd className="font-bold wrap-anywhere">
                {fellowship.leaderDisplayName || t("discoveryDetails.unavailable")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("discoveryDetails.created")}</dt>
              <dd>
                <time dateTime={fellowship.createdAt.toISOString()}>
                  {format.dateTime(fellowship.createdAt, { dateStyle: "medium", timeZone: "UTC" })}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("members", { count: fellowship.memberCount })}</dt>
              <dd>{t(fellowship.isPublic ? "publicShort" : "privateShort")}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted-foreground">
            {t(fellowship.isPublic ? "publicAccessDescription" : "privateAccessDescription")}
          </p>
          {requestPending ? (
            <div className="grid gap-2">
              <p role="status" className="text-center font-bold text-selection-text">
                {t("requestPending")}
              </p>
              <LoadingButton
                variant="outline"
                disabled={pending}
                isPending={pending && activeMutation === requestPending}
                pendingLabel={t("saving")}
                onClick={() => onCancel(requestPending)}
              >
                <XIcon />
                {t("cancelRequest")}
              </LoadingButton>
            </div>
          ) : (
            <LoadingButton
              disabled={pending}
              isPending={pending && activeMutation === fellowship.id}
              pendingLabel={t(fellowship.isPublic ? "joining" : "saving")}
              onClick={() => {
                if (fellowship.isPublic) {
                  onJoin(fellowship.id);
                } else {
                  onRequest(fellowship.id);
                }
              }}
            >
              {fellowship.isPublic ? <UserPlusIcon /> : <LockKeyholeIcon />}
              {t(fellowship.isPublic ? "join" : "requestToJoin")}
            </LoadingButton>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}
