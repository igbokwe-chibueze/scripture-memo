/** Client-only directory shared by production and isolated UI scenarios. */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { KeyRoundIcon, LockKeyholeIcon, SearchIcon, ShieldCheckIcon, UserRoundCheckIcon, UsersRoundIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { BadgeUnlockSequence } from "@/features/badges";
import { NavigationButton } from "@/components/shared/navigation-button";
import { FellowshipInsignia } from "@/features/fellowships/components/fellowship-insignia";
import { getFellowshipInsignia } from "@/features/fellowships/constants/fellowship-insignias";
import type { FellowshipDirectoryData, FellowshipSummary } from "@/features/fellowships/types/fellowship.types";
import type { BadgeUnlockResult } from "@/features/badges/types/badge.types";
import { LoadingButton } from "@/components/shared/loading-button";
import type { FellowshipDirectoryTransport } from "@/features/fellowships/types/fellowship-preview.types";
import { Input } from "@/components/ui/input";

/** Shows progress only on the selected card while preventing competing writes. */
function FellowshipCard({
  fellowship,
  onJoin,
  onRequest,
  onCancel,
  pending,
  activeMutation,
  linkHref,
}: {
  fellowship: FellowshipSummary;
  onJoin: (id: string) => void;
  onRequest: (id: string) => void;
  onCancel: (requestId: string) => void;
  pending: boolean;
  activeMutation: string | null;
  linkHref: (href: string) => string;
}): React.ReactNode {
  const t = useTranslations("Fellowships");
  return (
    <article className="rounded-[1.75rem] border border-violet-300/25 bg-card/90 p-5 shadow-lg shadow-violet-950/8">
      <div className="flex items-start justify-between gap-3">
        <FellowshipInsignia insigniaKey={fellowship.insigniaKey} label={t(getFellowshipInsignia(fellowship.insigniaKey).labelKey)} className="size-16 rounded-2xl" />
        <div className="flex flex-col items-end gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-black"><UsersRoundIcon className="size-3.5" /> {t("members", { count: fellowship.memberCount })}</span><span className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black">{fellowship.isPublic ? <UserRoundCheckIcon className="size-3.5" /> : <LockKeyholeIcon className="size-3.5" />}{fellowship.isPublic ? t("publicShort") : t("privateShort")}</span></div>
      </div>
      <h2 className="mt-4 font-heading text-xl font-black">{fellowship.name}</h2>
      <p className="mt-2 line-clamp-3 min-h-12 text-sm text-muted-foreground">{fellowship.description || t("noDescription")}</p>
      {/* Stack translated actions at the mobile baseline; shared loading
       * controls expose pending work and prevent duplicate mutations. */}
      <div className="mt-5 grid gap-2">
        {fellowship.isMember ? (
          <NavigationButton
            className="min-h-11"
            href={linkHref(`/fellowships/${fellowship.slug}`)}
            pendingLabel={t("opening")}
          >
            {t("open")}
          </NavigationButton>
        ) : fellowship.requestStatus === "PENDING" && fellowship.requestId ? (
          <>
            <span className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-500/10 px-3 text-center text-sm font-black text-violet-600 dark:text-violet-300">
              {t("requestPending")}
            </span>
            <LoadingButton
              variant="outline"
              disabled={pending}
              isPending={pending && activeMutation === fellowship.requestId}
              pendingLabel={t("saving")}
              onClick={() => onCancel(fellowship.requestId!)}
            >
              <XIcon />
              {t("cancelRequest")}
            </LoadingButton>
          </>
        ) : (
          <LoadingButton
            disabled={pending}
            isPending={pending && activeMutation === fellowship.id}
            pendingLabel={t(fellowship.isPublic ? "joining" : "saving")}
            onClick={() => fellowship.isPublic ? onJoin(fellowship.id) : onRequest(fellowship.id)}
          >
            {!fellowship.isPublic && <LockKeyholeIcon />}
            {t(fellowship.isPublic ? "join" : "requestToJoin")}
          </LoadingButton>
        )}
      </div>
    </article>
  );
}

/** Interactive directory for public discovery and private invite entry. */
export function FellowshipDirectoryContent({
  data,
  initialSearch,
  initialInviteCode,
  transport,
}: {
  data: FellowshipDirectoryData;
  initialSearch: string;
  initialInviteCode: string;
  transport: FellowshipDirectoryTransport;
}): React.ReactNode {
  const t = useTranslations("Fellowships");

  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [isPending, startTransition] = useTransition();
  const [activeMutation, setActiveMutation] = useState<string | null>(null);
  const [unlocks, setUnlocks] = useState<BadgeUnlockResult[]>([]);
  const [unlockIndex, setUnlockIndex] = useState(0);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);

  const handleResult = (result: Awaited<ReturnType<FellowshipDirectoryTransport["join"]>>): void => {
    if (!result.success || !result.data) {
      toast.error(result.message, { duration: Infinity });
      return;
    }
    toast.success(result.message);
    if (result.data.outcome === "REQUESTED") {
      transport.refresh();
      return;
    }
    if (result.data.badgeUnlocks.length > 0) {
      setUnlocks(result.data.badgeUnlocks);
      setUnlockIndex(0);
      setPendingSlug(result.data.slug);
    } else {
      transport.navigate(`/fellowships/${result.data.slug}`);
      transport.refresh();
    }
  };
  /** Keep the selected spinner tied to the operation through route refresh. */
  const runMutation = (key: string, work: () => Promise<void>): void => {
    if (isPending) return;
    setActiveMutation(key);
    startTransition(work);
  };
  const join = (fellowshipId: string): void => runMutation(fellowshipId, async () => {
    handleResult(await transport.join({ fellowshipId }));
  });
  const requestJoin = (fellowshipId: string): void => runMutation(fellowshipId, async () => {
    handleResult(await transport.request({ fellowshipId }));
  });
  const cancelRequest = (requestId: string): void => runMutation(requestId, async () => {
    const result = await transport.cancel({ requestId });
    if (!result.success) {
      toast.error(result.message, { duration: Infinity });
      return;
    }
    toast.success(result.message);
    transport.refresh();
  });
  const joinInvite = (): void => runMutation("invite", async () => {
    handleResult(await transport.joinInvite({ inviteCode }));
  });

  return (
    <>
      <section className="rounded-[2rem] border border-amber-300/25 bg-linear-to-br from-violet-950 via-slate-950 to-amber-950 p-5 text-white shadow-xl sm:p-7">
        <div className="flex items-center gap-3"><KeyRoundIcon className="size-6 text-amber-300" /><div><h2 className="font-heading text-xl font-black">{t("haveInvite")}</h2><p className="text-sm text-slate-300">{t("invitePrompt")}</p></div></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            value={inviteCode}
            disabled={isPending}
            onChange={(event) => setInviteCode(event.currentTarget.value)}
            placeholder={t("inviteCode")}
            className="min-h-12 border-white/15 bg-white/8 text-white"
          />
          <LoadingButton
            disabled={isPending || !inviteCode.trim()}
            isPending={isPending && activeMutation === "invite"}
            pendingLabel={t("joining")}
            onClick={joinInvite}
            className="min-h-12 bg-amber-400 font-black text-slate-950 hover:bg-amber-300"
          >
            {t("joinWithCode")}
          </LoadingButton>
        </div>
      </section>

      <section className="mt-9" aria-labelledby="my-fellowships"><div className="flex items-center justify-between gap-3"><h2 id="my-fellowships" className="font-heading text-2xl font-black">{t("yourFellowships")}</h2><NavigationButton href={transport.linkHref("/fellowships/new")} pendingLabel={t("opening")}>{t("create")}</NavigationButton></div>
        {data.memberships.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.memberships.map((item) => (
              <FellowshipCard
                key={item.id}
                fellowship={item}
                onJoin={join}
                onRequest={requestJoin}
                onCancel={cancelRequest}
                pending={isPending}
                linkHref={transport.linkHref}
                activeMutation={activeMutation}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-dashed p-8 text-center">
            <ShieldCheckIcon className="mx-auto size-10 text-violet-500" />
            <h3 className="mt-3 font-heading text-xl font-black">{t("noneYet")}</h3>
            <p className="mt-1 text-muted-foreground">{t("nonePrompt")}</p>
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="discover-fellowships"><h2 id="discover-fellowships" className="font-heading text-2xl font-black">{t("discover")}</h2><form className="relative mt-4"><SearchIcon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={initialSearch} placeholder={t("search")} className="min-h-12 rounded-2xl pl-12" /></form>
        {data.discoverableFellowships.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {data.discoverableFellowships.map((item) => (
              <FellowshipCard
                key={item.id}
                fellowship={item}
                onJoin={join}
                onRequest={requestJoin}
                onCancel={cancelRequest}
                pending={isPending}
                linkHref={transport.linkHref}
                activeMutation={activeMutation}
              />
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-muted p-6 text-center text-muted-foreground">
            {t("noFellowships")}
          </p>
        )}
      </section>
      {unlocks.length > 0 && <BadgeUnlockSequence badges={unlocks} index={unlockIndex} onAdvance={() => { if (unlockIndex + 1 < unlocks.length) { setUnlockIndex((value) => value + 1); return; } setUnlocks([]); if (pendingSlug) { transport.navigate(`/fellowships/${pendingSlug}`); transport.refresh(); } }} />}
    </>
  );
}
