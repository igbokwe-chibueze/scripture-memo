"use client";

/** One action surface reused by profile, discovery and private request lists. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UserPlusIcon, UserCheckIcon, ShieldBanIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/shared/loading-button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { showActionError } from "@/lib/errors/show-action-error";
import { updateFriendshipAction } from "../actions/update-friendship.action";
import type { FriendOperation } from "../schemas/friend.schema";
import type { FriendState } from "@/types/player-social.types";

/** Destructive social controls require a reviewable confirmation; ordinary requests do not. */
export function FriendControls({ publicId, relationship, displayName }: {
  publicId: string;
  relationship: FriendState;
  displayName: string;
}): React.ReactNode {
  const t = useTranslations("PlayerSocial");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeOperation, setActiveOperation] = useState<FriendOperation | null>(null);
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
        if (operation === "block") router.push("/friends?tab=blocked");
        router.refresh();
      } catch {
        toast.error(t("errors.failed"), { duration: Infinity });
      }
    });
  }

  if (relationship === "self") return null;
  const primary: FriendOperation = relationship === "incoming" ? "accept"
    : relationship === "outgoing" ? "cancel"
    : relationship === "friends" ? "unfriend"
    : relationship === "blocked" ? "unblock" : "request";

  return (
    <div className="flex flex-wrap gap-3">
      <LoadingButton
        isPending={pending && activeOperation === primary}
        disabled={pending}
        pendingLabel={t("saving")}
        variant={relationship === "none" || relationship === "incoming" ? "default" : "secondary"}
        onClick={() => primary === "unfriend" ? setConfirm("unfriend") : run(primary)}
      >
        {relationship === "friends" ? <UserCheckIcon aria-hidden="true" /> : <UserPlusIcon aria-hidden="true" />}
        {t(`actions.${primary}`)}
      </LoadingButton>
      {relationship === "incoming" && (
        <LoadingButton
          variant="secondary"
          disabled={pending}
          isPending={pending && activeOperation === "decline"}
          pendingLabel={t("saving")}
          onClick={() => run("decline")}
        >
          {t("actions.decline")}
        </LoadingButton>
      )}
      {relationship !== "blocked" && (
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
          <DialogDescription>{t(confirm === "block" ? "blockExplanation" : "unfriendExplanation")}</DialogDescription>
          <div className="flex flex-wrap gap-3">
            <LoadingButton
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
