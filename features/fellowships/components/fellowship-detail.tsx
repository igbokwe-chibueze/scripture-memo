"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Clock3Icon, CrownIcon, DoorOpenIcon, FlameIcon, InfoIcon, LockKeyholeIcon, MapPinCheckIcon, PencilIcon, UsersRoundIcon } from "lucide-react";
import { toast } from "sonner";
import { NavigationButton } from "@/components/shared/navigation-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leaveFellowshipAction } from "@/features/fellowships/actions/leave-fellowship.action";
import { FellowshipInsignia } from "@/features/fellowships/components/fellowship-insignia";
import { FellowshipInvitePanel } from "@/features/fellowships/components/fellowship-invite-panel";
import { FellowshipJoinRequestManager } from "@/features/fellowships/components/fellowship-join-request-manager";
import { getFellowshipInsignia } from "@/features/fellowships/constants/fellowship-insignias";
import type { FellowshipDetailData } from "@/features/fellowships/types/fellowship.types";

/** Member-safe detail surface; DTOs intentionally contain no email or raw user ID. */
export function FellowshipDetail({ fellowship }: { fellowship: FellowshipDetailData }): React.ReactNode {
  const t = useTranslations("Fellowships");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingRequestCount = fellowship.joinRequests.filter((request) => request.status === "PENDING").length;
  const defaultTab = fellowship.isLeader && pendingRequestCount > 0 ? "requests" : "members";

  const leave = (): void => startTransition(async () => {
    const result = await leaveFellowshipAction({ fellowshipId: fellowship.id });
    if (!result.success) { toast.error(result.message, { duration: Infinity }); return; }
    toast.success(result.message);
    router.push("/fellowships");
    router.refresh();
  });

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-violet-400/25 bg-linear-to-br from-violet-950 via-slate-950 to-amber-950 p-6 text-white shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <FellowshipInsignia insigniaKey={fellowship.insigniaKey} label={t(getFellowshipInsignia(fellowship.insigniaKey).labelKey)} className="size-20 rounded-2xl sm:size-24" />
            <div className="min-w-0"><p className="text-xs font-black tracking-[0.18em] text-amber-300 uppercase">{fellowship.isPublic ? t("public") : t("private")}</p><h1 className="mt-2 font-heading text-4xl font-black">{fellowship.name}</h1></div>
          </div>
          <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded-2xl bg-white/8 px-4 py-3 font-black"><UsersRoundIcon />{t("members", { count: fellowship.memberCount })}</span>{fellowship.isLeader && fellowship.inviteCode && <FellowshipInvitePanel fellowshipId={fellowship.id} fellowshipName={fellowship.name} initialInviteCode={fellowship.inviteCode} />}{fellowship.isLeader && <NavigationButton href={`/fellowships/${fellowship.slug}/edit`} pendingLabel={t("openingSettings")} variant="outline" className="border-white/20 bg-white/8 text-white"><PencilIcon />{t("manage")}</NavigationButton>}</div>
        </div>
      </section>

      <Tabs defaultValue={defaultTab} className="mt-8 gap-5">
        <TabsList className={`grid h-auto min-h-12 w-full rounded-2xl p-1 ${fellowship.isLeader ? "grid-cols-3" : "grid-cols-2"}`}>
          <TabsTrigger value="members" className="min-h-10 rounded-xl px-3 font-black"><UsersRoundIcon />{t("membersTab")}</TabsTrigger>
          {fellowship.isLeader && <TabsTrigger value="requests" className="min-h-10 rounded-xl px-3 font-black"><Clock3Icon />{t("requestsTab")}{pendingRequestCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 py-0.5 text-xs text-slate-950">{pendingRequestCount}</span>}</TabsTrigger>}
          <TabsTrigger value="about" className="min-h-10 rounded-xl px-3 font-black"><InfoIcon />{t("aboutTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <section><div className="flex items-center justify-between gap-3"><h2 className="font-heading text-2xl font-black">{t("leaderboard")}</h2>{fellowship.isMember && !fellowship.isLeader && <Button variant="outline" disabled={isPending} onClick={leave}><DoorOpenIcon />{t("leave")}</Button>}</div>
            <div className="mt-4 overflow-hidden rounded-3xl border bg-card"><div className="grid grid-cols-[3rem_1fr_auto] gap-3 border-b bg-muted/60 px-4 py-3 text-xs font-black uppercase"><span>#</span><span>{t("member")}</span><span>{t("progress")}</span></div>{fellowship.members.map((member) => <div key={`${member.rank}-${member.displayName}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b px-4 py-4 last:border-0"><span className="font-heading text-xl font-black text-amber-600">{member.rank}</span><div className="min-w-0"><p className="truncate font-black">{member.displayName}{member.isLeader && <CrownIcon className="ml-2 inline size-4 text-amber-500" aria-label={t("leader")} />}</p><p className="text-xs text-muted-foreground">{member.countryCode ?? t("globalMember")}</p></div><div className="text-right text-xs font-bold"><p className="inline-flex items-center gap-1"><MapPinCheckIcon className="size-3.5" />{member.waypointsCompleted}</p><p className="mt-1 inline-flex items-center gap-1 text-amber-700 dark:text-amber-300"><FlameIcon className="size-3.5" />{member.glowPoints}</p></div></div>)}</div>
          </section>
        </TabsContent>

        {fellowship.isLeader && <TabsContent value="requests"><FellowshipJoinRequestManager requests={fellowship.joinRequests} /></TabsContent>}

        <TabsContent value="about">
          <section className="grid gap-4 rounded-[2rem] border bg-card p-5 shadow-lg sm:grid-cols-2 sm:p-7">
            <div className="rounded-2xl bg-muted/60 p-5"><span className="grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300"><InfoIcon /></span><h2 className="mt-4 font-heading text-xl font-black">{t("aboutFellowship")}</h2><p className="mt-2 text-muted-foreground">{fellowship.description || t("noDescription")}</p></div>
            <div className="rounded-2xl bg-muted/60 p-5"><span className="grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">{fellowship.isPublic ? <UsersRoundIcon /> : <LockKeyholeIcon />}</span><h2 className="mt-4 font-heading text-xl font-black">{fellowship.isPublic ? t("public") : t("private")}</h2><p className="mt-2 text-muted-foreground">{fellowship.isPublic ? t("publicAccessDescription") : t("privateAccessDescription")}</p></div>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
