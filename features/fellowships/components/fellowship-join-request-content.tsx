/** Shared client-only leader queue; its caller supplies the decision transport. */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon, Clock3Icon, FlameIcon, MapPinCheckIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import type { FellowshipJoinRequestItem } from "@/features/fellowships/types/fellowship.types";
import type { FellowshipDecisionTransport } from "../types/fellowship-preview.types";
import { LoadingButton } from "@/components/shared/loading-button";

/** Gives a fellowship leader one focused queue for individual access decisions. */
export function FellowshipJoinRequestContent({
  requests,
  transport,
}: {
  requests: FellowshipJoinRequestItem[];
  transport: FellowshipDecisionTransport;
}): React.ReactNode {
  const t = useTranslations("Fellowships");

  const [isPending, startTransition] = useTransition();
  const [activeDecision, setActiveDecision] = useState<string | null>(null);
  const pendingRequests = requests.filter((request) => request.status === "PENDING");
  const resolvedRequests = requests.filter((request) => request.status !== "PENDING");

  /** Only the chosen decision spins; all decisions disable until refresh ends. */
  const resolve = (requestId: string, decision: "APPROVE" | "REJECT"): void => {
    if (isPending) return;
    setActiveDecision(`${requestId}:${decision}`);
    startTransition(async () => {
      const result = await transport.resolve({ requestId, decision });
      if (!result.success) {
        toast.error(result.message, { duration: Infinity });
        return;
      }
      toast.success(result.message);
      transport.refresh();
    });
  };

  return (
    <section className="rounded-[2rem] border bg-card p-5 shadow-lg sm:p-7" aria-labelledby="join-requests-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black tracking-[0.16em] text-violet-600 uppercase dark:text-violet-300">{t("leaderTools")}</p><h2 id="join-requests-title" className="mt-1 font-heading text-2xl font-black">{t("joinRequests")}</h2></div>
        <span className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-4 py-2 font-black"><Clock3Icon className="size-4" />{t("pendingCount", { count: pendingRequests.length })}</span>
      </div>

      {pendingRequests.length > 0 ? (
        <div className="mt-5 grid gap-3">
          {pendingRequests.map((request) => (
            <article
              key={request.id}
              className="grid gap-4 rounded-2xl border p-4 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div>
                <p className="font-heading text-lg font-black">{request.displayName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(request.source === "INVITE" ? "fromInvite" : "fromDirectory")}
                </p>
                <div className="mt-2 flex gap-3 text-xs font-bold text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPinCheckIcon className="size-3.5" />
                    {request.waypointsCompleted}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FlameIcon className="size-3.5" />
                    {request.glowPoints}
                  </span>
                </div>
              </div>
              {/* Full-width mobile controls accommodate translated pending
               * labels without shrinking the required touch targets. */}
              <div className="grid gap-2 sm:grid-cols-2">
                <LoadingButton
                  disabled={isPending}
                  isPending={isPending && activeDecision === `${request.id}:APPROVE`}
                  pendingLabel={t("saving")}
                  onClick={() => resolve(request.id, "APPROVE")}
                >
                  <CheckIcon />
                  {t("approve")}
                </LoadingButton>
                <LoadingButton
                  variant="outline"
                  disabled={isPending}
                  isPending={isPending && activeDecision === `${request.id}:REJECT`}
                  pendingLabel={t("saving")}
                  onClick={() => resolve(request.id, "REJECT")}
                >
                  <XIcon />
                  {t("reject")}
                </LoadingButton>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-muted p-5 text-center text-muted-foreground">
          {t("noPendingRequests")}
        </p>
      )}

      {resolvedRequests.length > 0 && <details className="mt-5"><summary className="cursor-pointer font-black">{t("requestHistory")}</summary><div className="mt-3 grid gap-2">{resolvedRequests.map((request) => <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3"><span className="font-bold">{request.displayName}</span><span className="text-xs font-black uppercase text-muted-foreground">{t(`requestStatuses.${request.status}`)}</span></div>)}</div></details>}
    </section>
  );
}
