"use client";

import { useTranslations } from "next-intl";
import { CopyIcon, LinkIcon, Share2Icon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type FellowshipInvitePanelProps = {
  fellowshipId: string;
  fellowshipName: string;
  initialInviteCode: string;
};

/** Keeps private invite tools behind one game-like, responsive action surface. */
export function FellowshipInvitePanel({ fellowshipName, initialInviteCode }: FellowshipInvitePanelProps): React.ReactNode {
  const t = useTranslations("Fellowships");
  const inviteCode = initialInviteCode;

  const invitationUrl = (): string => `${window.location.origin}/join/${encodeURIComponent(inviteCode)}`;
  const copy = async (value: string, message: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error(t("inviteCopyFailed"), { duration: Infinity });
    }
  };
  const shareInvite = async (): Promise<void> => {
    const title = t("inviteShareTitle", { name: fellowshipName });
    const text = t("inviteShareText", { code: inviteCode });
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: invitationUrl() });
        return;
      }
      await copy(`${text} ${invitationUrl()}`, t("inviteSharedFallback"));
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(t("inviteShareFailed"), { duration: Infinity });
    }
  };
  return (
    <Dialog>
      <DialogTrigger render={<Button className="min-h-11 px-4 font-bold" />}>
        <UserPlusIcon />{t("invite")}
      </DialogTrigger>
      <DialogContent className="top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 gap-5 rounded-t-dialog rounded-b-none border-border bg-card p-6 text-card-foreground ring-0 transition-transform duration-300 ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-dialog sm:data-starting-style:-translate-y-1/2 sm:data-ending-style:-translate-y-1/2">
        <DialogHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-control bg-primary text-primary-foreground"><UserPlusIcon /></div>
          <DialogTitle className="font-heading text-2xl font-bold">{t("inviteTitle")}</DialogTitle>
          <DialogDescription className="text-foreground">{t("invitePanelDescription")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-card border border-border bg-muted p-4">
          <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{t("inviteCode")}</p>
          <code className="mt-2 block break-all text-base font-bold text-foreground">{inviteCode}</code>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => void shareInvite()} className="min-h-12 flex-col gap-1"><Share2Icon />{t("shareInvite")}</Button>
          <Button variant="outline" onClick={() => void copy(invitationUrl(), t("inviteLinkCopied"))} className="min-h-12 flex-col gap-1"><LinkIcon />{t("copyLink")}</Button>
          <Button variant="outline" onClick={() => void copy(inviteCode, t("inviteCopied"))} className="min-h-12 flex-col gap-1"><CopyIcon />{t("copyCode")}</Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
