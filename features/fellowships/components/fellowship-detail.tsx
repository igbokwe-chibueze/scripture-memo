"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CrownIcon, DoorOpenIcon, FlameIcon, MapPinCheckIcon, PencilIcon, UsersRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { leaveFellowshipAction } from "@/features/fellowships/actions/leave-fellowship.action";
import type { FellowshipDetailData } from "@/features/fellowships/types/fellowship.types";
import { Button } from "@/components/ui/button";
import { NavigationButton } from "@/components/shared/navigation-button";
import { FellowshipInsignia } from "@/features/fellowships/components/fellowship-insignia";
import { getFellowshipInsignia } from "@/features/fellowships/constants/fellowship-insignias";
import { FellowshipInvitePanel } from "@/features/fellowships/components/fellowship-invite-panel";
import { FellowshipJoinRequestManager } from "@/features/fellowships/components/fellowship-join-request-manager";

/** Member-safe detail surface; DTOs intentionally contain no email or raw user ID. */
export function FellowshipDetail({ fellowship }: { fellowship: FellowshipDetailData }): React.ReactNode {
  const t = useTranslations("Fellowships");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const leave = (): void => startTransition(async () => { const result = await leaveFellowshipAction({ fellowshipId: fellowship.id }); if (!result.success) { toast.error(result.message, { duration: Infinity }); return; } toast.success(result.message); router.push("/fellowships"); router.refresh(); });
  return <>
    <section className="overflow-hidden rounded-[2rem] border border-violet-400/25 bg-linear-to-br from-violet-950 via-slate-950 to-amber-950 p-6 text-white shadow-2xl sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-4"><FellowshipInsignia insigniaKey={fellowship.insigniaKey} label={t(getFellowshipInsignia(fellowship.insigniaKey).labelKey)} className="size-20 rounded-2xl sm:size-24" /><div className="min-w-0"><p className="text-xs font-black tracking-[0.18em] text-amber-300 uppercase">{fellowship.isPublic ? t("public") : t("private")}</p><h1 className="mt-2 font-heading text-4xl font-black">{fellowship.name}</h1><p className="mt-3 max-w-2xl text-slate-300">{fellowship.description || t("noDescription")}</p></div></div><div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-2xl bg-white/8 px-4 py-3 font-black"><UsersRoundIcon />{t("members", { count: fellowship.memberCount })}</span>{fellowship.isLeader && fellowship.inviteCode && <FellowshipInvitePanel fellowshipId={fellowship.id} fellowshipName={fellowship.name} initialInviteCode={fellowship.inviteCode} />}{fellowship.isLeader && <NavigationButton href={`/fellowships/${fellowship.slug}/edit`} pendingLabel={t("openingSettings")} variant="outline" className="border-white/20 bg-white/8 text-white"><PencilIcon />{t("manage")}</NavigationButton>}</div></div>
    </section>
    {fellowship.isLeader && <FellowshipJoinRequestManager requests={fellowship.joinRequests} />}
    <section className="mt-8"><div className="flex items-center justify-between gap-3"><h2 className="font-heading text-2xl font-black">{t("leaderboard")}</h2>{fellowship.isMember && !fellowship.isLeader && <Button variant="outline" disabled={isPending} onClick={leave}><DoorOpenIcon />{t("leave")}</Button>}</div>
      <div className="mt-4 overflow-hidden rounded-3xl border bg-card"><div className="grid grid-cols-[3rem_1fr_auto] gap-3 border-b bg-muted/60 px-4 py-3 text-xs font-black uppercase"><span>#</span><span>{t("member")}</span><span>{t("progress")}</span></div>{fellowship.members.map((member) => <div key={`${member.rank}-${member.displayName}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b px-4 py-4 last:border-0"><span className="font-heading text-xl font-black text-amber-600">{member.rank}</span><div className="min-w-0"><p className="truncate font-black">{member.displayName}{member.isLeader && <CrownIcon className="ml-2 inline size-4 text-amber-500" aria-label={t("leader")} />}</p><p className="text-xs text-muted-foreground">{member.countryCode ?? t("globalMember")}</p></div><div className="text-right text-xs font-bold"><p className="inline-flex items-center gap-1"><MapPinCheckIcon className="size-3.5" />{member.waypointsCompleted}</p><p className="mt-1 inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><FlameIcon className="size-3.5" />{member.glowPoints}</p></div></div>)}</div>
    </section>
  </>;
}
