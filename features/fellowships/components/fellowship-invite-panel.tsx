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
      <DialogTrigger render={<Button className="min-h-11 bg-amber-400 px-4 font-black text-slate-950 hover:bg-amber-300" />}>
        <UserPlusIcon />{t("invite")}
      </DialogTrigger>
      <DialogContent className="top-auto bottom-0 left-0 w-full max-w-none translate-x-0 translate-y-0 gap-5 rounded-t-[2rem] rounded-b-none border-violet-400/30 bg-linear-to-br from-violet-950 via-slate-950 to-amber-950 p-6 text-white ring-0 transition-transform duration-300 ease-out data-starting-style:translate-y-full data-ending-style:translate-y-full sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem] sm:data-starting-style:-translate-y-1/2 sm:data-ending-style:-translate-y-1/2">
        <DialogHeader>
          <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 shadow-[0_4px_0_rgb(120_53_15/0.8)]"><UserPlusIcon /></div>
          <DialogTitle className="font-heading text-2xl font-black">{t("inviteTitle")}</DialogTitle>
          <DialogDescription className="text-slate-300">{t("invitePanelDescription")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <p className="text-xs font-black tracking-wider text-violet-300 uppercase">{t("inviteCode")}</p>
          <code className="mt-2 block break-all text-base font-black text-white">{inviteCode}</code>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => void shareInvite()} className="min-h-12 flex-col gap-1 bg-amber-400 text-slate-950 hover:bg-amber-300"><Share2Icon />{t("shareInvite")}</Button>
          <Button variant="outline" onClick={() => void copy(invitationUrl(), t("inviteLinkCopied"))} className="min-h-12 flex-col gap-1 border-white/15 bg-white/8 text-white"><LinkIcon />{t("copyLink")}</Button>
          <Button variant="outline" onClick={() => void copy(inviteCode, t("inviteCopied"))} className="min-h-12 flex-col gap-1 border-white/15 bg-white/8 text-white"><CopyIcon />{t("copyCode")}</Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
