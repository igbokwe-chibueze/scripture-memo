"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Clock3Icon,
  CrownIcon,
  DoorOpenIcon,
  FlameIcon,
  InfoIcon,
  LockKeyholeIcon,
  MapPinCheckIcon,
  PencilIcon,
  UsersRoundIcon,
} from "lucide-react";
import { toast } from "sonner";
import { NavigationButton } from "@/components/shared/navigation-button";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { leaveFellowshipAction } from "@/features/fellowships/actions/leave-fellowship.action";
import { FellowshipInsignia } from "@/features/fellowships/components/fellowship-insignia";
import { FellowshipInvitePanel } from "@/features/fellowships/components/fellowship-invite-panel";
import { FellowshipJoinRequestManager } from "@/features/fellowships/components/fellowship-join-request-manager";
import { getFellowshipInsignia } from "@/features/fellowships/constants/fellowship-insignias";
import type { FellowshipDetailData } from "@/features/fellowships/types/fellowship.types";

type MemberProgressMetricProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: boolean;
};

/**
 * Presents one compact leaderboard value while keeping its full meaning
 * available to keyboard, pointer, and assistive-technology users.
 */
function MemberProgressMetric({
  label,
  value,
  icon,
  accent = false,
}: MemberProgressMetricProps): React.ReactNode {
  const formattedValue = value.toLocaleString();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={`inline-flex min-h-11 w-full min-w-11 items-center justify-center gap-1.5 rounded-xl border bg-muted/60 px-3 font-black outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto ${accent ? "text-amber-700 dark:text-amber-300" : "text-foreground"}`}
            aria-label={`${label}: ${formattedValue}`}
          />
        }
      >
        {icon}
        <span>{formattedValue}</span>
      </TooltipTrigger>
      <TooltipContent>
        {label}: {formattedValue}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Renders the member-safe fellowship detail experience. The supplied DTO omits
 * email addresses and raw user IDs so this client component cannot expose them.
 */
export function FellowshipDetail({
  fellowship,
}: {
  fellowship: FellowshipDetailData;
}): React.ReactNode {
  const t = useTranslations("Fellowships");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pendingRequestCount = fellowship.joinRequests.filter(
    (request) => request.status === "PENDING",
  ).length;
  const defaultTab =
    fellowship.isLeader && pendingRequestCount > 0 ? "requests" : "members";

  /**
   * Leaves the fellowship through the authorized server action, then returns
   * the learner to the directory only after the mutation succeeds.
   */
  const leave = (): void => {
    startTransition(async () => {
      const result = await leaveFellowshipAction({
        fellowshipId: fellowship.id,
      });

      if (!result.success) {
        toast.error(result.message, { duration: Infinity });
        return;
      }

      toast.success(result.message);
      router.push("/fellowships");
      router.refresh();
    });
  };

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-violet-400/25 bg-linear-to-br from-violet-950 via-slate-950 to-amber-950 p-5 text-white shadow-2xl sm:p-8">
        {/*
         * Mobile uses a vertical identity stack so the insignia never steals
         * width from long fellowship names. The `sm` layout progressively
         * returns to the wider horizontal composition.
         */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col items-center text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
            <FellowshipInsignia
              insigniaKey={fellowship.insigniaKey}
              label={t(
                getFellowshipInsignia(fellowship.insigniaKey).labelKey,
              )}
              className="size-24 rounded-2xl"
            />
            <div className="mt-4 min-w-0 sm:mt-0">
              <p className="text-xs font-black tracking-[0.18em] text-amber-300 uppercase">
                {fellowship.isPublic ? t("public") : t("private")}
              </p>
              <h1 className="mt-2 break-words font-heading text-3xl leading-tight font-black sm:text-4xl">
                {fellowship.name}
              </h1>
            </div>
          </div>

          {/* Mobile keeps the count readable above two equally sized actions. */}
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap">
            <span className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white/8 px-4 py-3 font-black sm:col-span-1">
              <UsersRoundIcon aria-hidden="true" />
              {t("members", { count: fellowship.memberCount })}
            </span>

            {fellowship.isLeader && fellowship.inviteCode && (
              <FellowshipInvitePanel
                fellowshipId={fellowship.id}
                fellowshipName={fellowship.name}
                initialInviteCode={fellowship.inviteCode}
              />
            )}

            {fellowship.isLeader && (
              <NavigationButton
                href={`/fellowships/${fellowship.slug}/edit`}
                pendingLabel={t("openingSettings")}
                variant="outline"
                className="w-full border-white/20 bg-white/8 text-white sm:w-auto"
              >
                <PencilIcon aria-hidden="true" />
                {t("manage")}
              </NavigationButton>
            )}
          </div>
        </div>
      </section>

      <Tabs defaultValue={defaultTab} className="mt-6 gap-5 sm:mt-8">
        {/*
         * Labels receive the limited mobile width. Decorative icons return at
         * `sm`, where all three controls have room without squeezing the text.
         */}
        <TabsList
          className={`grid h-auto min-h-12 w-full rounded-2xl p-1 ${fellowship.isLeader ? "grid-cols-3" : "grid-cols-2"}`}
        >
          <TabsTrigger
            value="members"
            className="min-h-10 rounded-xl px-1 text-xs font-black sm:px-3 sm:text-sm"
          >
            <UsersRoundIcon className="hidden sm:block" aria-hidden="true" />
            {t("membersTab")}
          </TabsTrigger>

          {fellowship.isLeader && (
            <TabsTrigger
              value="requests"
              className="min-h-10 rounded-xl px-1 text-xs font-black sm:px-3 sm:text-sm"
            >
              <Clock3Icon className="hidden sm:block" aria-hidden="true" />
              {t("requestsTab")}
              {pendingRequestCount > 0 && (
                <span className="grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 py-0.5 text-xs text-slate-950">
                  {pendingRequestCount}
                </span>
              )}
            </TabsTrigger>
          )}

          <TabsTrigger
            value="about"
            className="min-h-10 rounded-xl px-1 text-xs font-black sm:px-3 sm:text-sm"
          >
            <InfoIcon className="hidden sm:block" aria-hidden="true" />
            {t("aboutTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-xl leading-tight font-black sm:text-2xl">
                {t("leaderboard")}
              </h2>
              {fellowship.isMember && !fellowship.isLeader && (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={leave}
                >
                  <DoorOpenIcon aria-hidden="true" />
                  {t("leave")}
                </Button>
              )}
            </div>

            <div className="mt-4 overflow-hidden rounded-3xl border bg-card">
              {/* The column header is useful on desktop but redundant on cards. */}
              <div className="hidden grid-cols-[3rem_1fr_auto] gap-3 border-b bg-muted/60 px-4 py-3 text-xs font-black uppercase sm:grid">
                <span>#</span>
                <span>{t("member")}</span>
                <span>{t("progress")}</span>
              </div>

              {fellowship.members.map((member) => (
                <div
                  key={`${member.rank}-${member.displayName}`}
                  className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-x-3 border-b px-4 py-4 last:border-0 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:gap-3"
                >
                  <span className="grid size-8 place-items-center rounded-full bg-amber-500/12 font-heading text-base font-black text-amber-600 sm:bg-transparent sm:text-xl">
                    {member.rank}
                  </span>

                  <div className="min-w-0">
                    <p className="truncate font-black">
                      {member.displayName}
                      {member.isLeader && (
                        <CrownIcon
                          className="ml-2 inline size-4 text-amber-500"
                          aria-label={t("leader")}
                        />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.countryCode ?? t("globalMember")}
                    </p>
                  </div>

                  {/* Mobile metrics occupy equal columns directly under the name. */}
                  <div className="col-start-2 mt-3 grid grid-cols-2 gap-2 sm:col-start-auto sm:mt-0 sm:flex sm:justify-end sm:gap-3">
                    <MemberProgressMetric
                      label={t("completedWaypointsMetric")}
                      value={member.waypointsCompleted}
                      icon={
                        <MapPinCheckIcon
                          className="size-4"
                          aria-hidden="true"
                        />
                      }
                    />
                    <MemberProgressMetric
                      label={t("glowPointsMetric")}
                      value={member.glowPoints}
                      icon={
                        <FlameIcon className="size-4" aria-hidden="true" />
                      }
                      accent
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        {fellowship.isLeader && (
          <TabsContent value="requests">
            <FellowshipJoinRequestManager
              requests={fellowship.joinRequests}
            />
          </TabsContent>
        )}

        <TabsContent value="about">
          <section className="grid gap-4 rounded-[2rem] border bg-card p-5 shadow-lg sm:grid-cols-2 sm:p-7">
            <div className="rounded-2xl bg-muted/60 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <InfoIcon aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-heading text-xl font-black">
                {t("aboutFellowship")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {fellowship.description || t("noDescription")}
              </p>
            </div>

            <div className="rounded-2xl bg-muted/60 p-5">
              <span className="grid size-11 place-items-center rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300">
                {fellowship.isPublic ? (
                  <UsersRoundIcon aria-hidden="true" />
                ) : (
                  <LockKeyholeIcon aria-hidden="true" />
                )}
              </span>
              <h2 className="mt-4 font-heading text-xl font-black">
                {fellowship.isPublic ? t("public") : t("private")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {fellowship.isPublic
                  ? t("publicAccessDescription")
                  : t("privateAccessDescription")}
              </p>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </>
  );
}
