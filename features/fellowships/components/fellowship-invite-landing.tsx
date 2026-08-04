"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock3Icon, LogInIcon, ShieldCheckIcon, SparklesIcon, UserPlusIcon, UsersRoundIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { BadgeUnlockSequence } from "@/features/badges/components/badge-unlock-screen";
import { NavigationButton } from "@/components/shared/navigation-button";
import { Button } from "@/components/ui/button";
import { joinFellowshipByInviteAction } from "@/features/fellowships/actions/join-fellowship-by-invite.action";
import { cancelFellowshipJoinRequestAction } from "@/features/fellowships/actions/cancel-fellowship-join-request.action";
import { FellowshipInsignia } from "@/features/fellowships/components/fellowship-insignia";
import { getFellowshipInsignia } from "@/features/fellowships/constants/fellowship-insignias";
import type { FellowshipInvitePreview } from "@/features/fellowships/types/fellowship.types";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";

type FellowshipInviteLandingProps = {
  inviteCode: string;
  fellowship: FellowshipInvitePreview;
  isAuthenticated: boolean;
};

/** Presents an explicit invitation decision without mutating membership on page load. */
export function FellowshipInviteLanding({ inviteCode, fellowship, isAuthenticated }: FellowshipInviteLandingProps): React.ReactNode {
  const t = useTranslations("Fellowships");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [unlocks, setUnlocks] = useState<BadgeUnlockResult[]>([]);
  const [unlockIndex, setUnlockIndex] = useState(0);
  const returnPath = `/join/${encodeURIComponent(inviteCode)}`;
  const encodedReturnPath = encodeURIComponent(returnPath);

  const join = (): void => startTransition(async () => {
    const result = await joinFellowshipByInviteAction({ inviteCode });
    if (!result.success || !result.data) {
      toast.error(result.message, { duration: Infinity });
      return;
    }
    toast.success(result.message);
    if (result.data.outcome === "REQUESTED") {
      router.refresh();
      return;
    }
    if (result.data.badgeUnlocks.length > 0) {
      setUnlocks(result.data.badgeUnlocks);
      setUnlockIndex(0);
      return;
    }
    router.replace(`/fellowships/${result.data.slug}`);
    router.refresh();
  });

  const finishBadges = (): void => {
    if (unlockIndex + 1 < unlocks.length) {
      setUnlockIndex((value) => value + 1);
      return;
    }
    setUnlocks([]);
    router.replace(`/fellowships/${fellowship.slug}`);
    router.refresh();
  };

  const cancelRequest = (): void => {
    if (!fellowship.requestId) return;
    startTransition(async () => {
      const result = await cancelFellowshipJoinRequestAction({ requestId: fellowship.requestId });
      if (!result.success) { toast.error(result.message, { duration: Infinity }); return; }
      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <main className="dark relative grid min-h-svh place-items-center overflow-hidden bg-linear-to-b from-violet-950 via-slate-950 to-amber-950 px-4 py-10 text-white">
      <SparklesIcon className="absolute -top-10 left-1/2 size-64 -translate-x-1/2 text-amber-300/10" aria-hidden="true" />
      <section className="relative w-full max-w-lg rounded-[2.25rem] border border-violet-400/30 bg-slate-950/85 p-6 text-center shadow-2xl shadow-violet-950/60 sm:p-9">
        <p className="text-xs font-black tracking-[0.2em] text-amber-300 uppercase">{t("invitedEyebrow")}</p>
        <FellowshipInsignia insigniaKey={fellowship.insigniaKey} label={t(getFellowshipInsignia(fellowship.insigniaKey).labelKey)} className="mx-auto mt-5 size-28 rounded-[1.75rem] sm:size-32" />
        <h1 className="mt-5 font-heading text-4xl font-black">{fellowship.name}</h1>
        {fellowship.description && <p className="mx-auto mt-3 max-w-sm text-slate-300">{fellowship.description}</p>}
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 font-black"><UsersRoundIcon />{t("members", { count: fellowship.memberCount })}</p>

        <div className="mt-7 grid gap-3">
          {fellowship.isMember ? <NavigationButton href={`/fellowships/${fellowship.slug}`} pendingLabel={t("opening")} size="lg"><ShieldCheckIcon />{t("open")}</NavigationButton> : isAuthenticated && fellowship.requestStatus === "PENDING" ? <><div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-400/10 px-4 font-black text-violet-200"><Clock3Icon />{t("requestPending")}</div><Button variant="outline" size="lg" disabled={isPending} onClick={cancelRequest}><XIcon />{t("cancelRequest")}</Button></> : isAuthenticated ? <><Button size="lg" disabled={isPending} onClick={join}><UserPlusIcon />{isPending ? t("joining") : fellowship.isPublic ? t("acceptInvite") : t("requestToJoin")}</Button><NavigationButton href="/fellowships" pendingLabel={t("opening")} variant="outline" size="lg"><XIcon />{t("declineInvite")}</NavigationButton></> : <><NavigationButton href={`/login?next=${encodedReturnPath}`} pendingLabel={t("opening")} size="lg"><LogInIcon />{t("loginToJoin")}</NavigationButton><NavigationButton href={`/register?next=${encodedReturnPath}`} pendingLabel={t("opening")} variant="outline" size="lg"><UserPlusIcon />{t("createToJoin")}</NavigationButton><NavigationButton href="/" pendingLabel={t("opening")} variant="ghost" size="lg"><XIcon />{t("cancel")}</NavigationButton></>}
        </div>
      </section>
      {unlocks.length > 0 && <BadgeUnlockSequence badges={unlocks} index={unlockIndex} onAdvance={finishBadges} />}
    </main>
  );
}
