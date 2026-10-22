"use client";

/** One action surface reused by profile, discovery and private request lists. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/lib/toast";
import {
  UserPlusIcon,
  UserCheckIcon,
  ShieldBanIcon,
  EllipsisIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { showActionError } from "@/lib/errors/show-action-error";
import { updateFriendshipAction } from "../actions/update-friendship.action";
import type { FriendOperation } from "../schemas/friend.schema";
import type { FriendState } from "@/types/player-social.types";

/** Destructive social controls require a reviewable confirmation; ordinary requests do not. */
export function FriendControls({
  publicId,
  relationship,
  displayName,
  compact = false,
  onChanged,
}: {
  publicId: string;
  relationship: FriendState;
  displayName: string;
  compact?: boolean;
  onChanged?: (operation: FriendOperation) => void;
}): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeOperation, setActiveOperation] =
    useState<FriendOperation | null>(null);
  const [confirm, setConfirm] = useState<"block" | "unfriend" | null>(null);

  /** Refresh authoritative state after success; failure preserves the existing controls. */
  function run(operation: FriendOperation): void {
    setActiveOperation(operation);
    startTransition(async () => {
      try {
        const result = await updateFriendshipAction({ publicId, operation });
        if (!result.success) return showActionError(result);
        toast.success(result.message);
        setConfirm(null);
        onChanged?.(operation);
        if (operation === "block") router.push("/friends?tab=blocked");
        router.refresh();
      } catch {
        toast.error(t("errors.failed"), { duration: Infinity });
      }
    });
  }

  if (relationship === "self") return null;
  const primary: FriendOperation =
    relationship === "incoming"
      ? "accept"
      : relationship === "outgoing"
        ? "cancel"
        : relationship === "friends"
          ? "unfriend"
          : relationship === "blocked"
            ? "unblock"
            : "request";

  return (
    <div className="flex flex-wrap gap-3">
      {compact ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="size-11 p-0"
                disabled={pending}
                aria-label={t("memberActions", { name: displayName })}
              />
            }
          >
            {pending ? (
              <LoadingSpinner size="sm" label={t("saving")} />
            ) : (
              <EllipsisIcon aria-hidden="true" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem
              className="min-h-11"
              onClick={() =>
                primary === "unfriend" ? setConfirm("unfriend") : run(primary)
              }
            >
              {t(`actions.${primary}`)}
            </DropdownMenuItem>
            {relationship === "incoming" && (
              <DropdownMenuItem
                className="min-h-11"
                onClick={() => run("decline")}
              >
                {t("actions.decline")}
              </DropdownMenuItem>
            )}
            {relationship !== "blocked" && (
              <DropdownMenuItem
                variant="destructive"
                className="min-h-11"
                onClick={() => setConfirm("block")}
              >
                {t("actions.block")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <LoadingButton
            className="min-h-11"
            isPending={pending && activeOperation === primary}
            disabled={pending}
            pendingLabel={t("saving")}
            variant={
              relationship === "none" || relationship === "incoming"
                ? "default"
                : "secondary"
            }
            onClick={() =>
              primary === "unfriend" ? setConfirm("unfriend") : run(primary)
            }
          >
            {relationship === "friends" ? (
              <UserCheckIcon aria-hidden="true" />
            ) : (
              <UserPlusIcon aria-hidden="true" />
            )}
            {t(`actions.${primary}`)}
          </LoadingButton>
          {relationship === "incoming" && (
            <LoadingButton
              className="min-h-11"
              variant="secondary"
              disabled={pending}
              isPending={pending && activeOperation === "decline"}
              pendingLabel={t("saving")}
              onClick={() => run("decline")}
            >
              {t("actions.decline")}
            </LoadingButton>
          )}
        </>
      )}
      {!compact && relationship !== "blocked" && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setConfirm("block")}
          className="min-h-11"
        >
          <ShieldBanIcon aria-hidden="true" />
          {t("actions.block")}
        </Button>
      )}
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && !pending && setConfirm(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogTitle>{t("confirmTitle", { name: displayName })}</DialogTitle>
          <DialogDescription>
            {t(
              confirm === "block" ? "blockExplanation" : "unfriendExplanation",
            )}
          </DialogDescription>
          <div className="flex flex-wrap gap-3">
            <LoadingButton
              className="min-h-11"
              variant="destructive"
              isPending={pending}
              pendingLabel={t("saving")}
              onClick={() => confirm && run(confirm)}
            >
              {t(`actions.${confirm ?? "block"}`)}
            </LoadingButton>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setConfirm(null)}
              className="min-h-11"
            >
              {t("keep")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
