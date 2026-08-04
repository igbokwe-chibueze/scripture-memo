"use client";

import { useState, useTransition } from "react";
import { CheckIcon, KeyRoundIcon, RefreshCwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { regenerateFellowshipInviteAction } from "@/features/fellowships/actions/regenerate-fellowship-invite.action";

/** Keeps destructive invite rotation in leader settings, away from everyday sharing. */
export function FellowshipInviteSettings({ fellowshipId }: { fellowshipId: string }): React.ReactNode {
  const t = useTranslations("Fellowships");
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const regenerate = (): void => startTransition(async () => {
    const result = await regenerateFellowshipInviteAction({ fellowshipId });
    if (!result.success) {
      toast.error(result.message, { duration: Infinity });
      return;
    }
    setConfirming(false);
    toast.success(result.message);
  });

  return (
    <section className="mt-6 rounded-[2rem] border border-amber-400/25 bg-card p-5 shadow-xl sm:p-7">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-600 dark:text-amber-300"><KeyRoundIcon /></span>
        <div><h2 className="font-heading text-xl font-black">{t("inviteSettingsTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("inviteSettingsDescription")}</p></div>
      </div>
      {confirming ? <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4"><p className="font-bold">{t("regenerateWarning")}</p><div className="mt-4 grid grid-cols-2 gap-3"><Button type="button" variant="outline" disabled={isPending} onClick={() => setConfirming(false)}>{t("cancel")}</Button><Button type="button" disabled={isPending} onClick={regenerate}><CheckIcon />{isPending ? t("regenerating") : t("confirm")}</Button></div></div> : <Button type="button" variant="outline" onClick={() => setConfirming(true)} className="mt-5 min-h-11"><RefreshCwIcon />{t("regenerateInvite")}</Button>}
    </section>
  );
}
