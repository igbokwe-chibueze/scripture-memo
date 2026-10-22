"use client";

/** Identity and overview first, with the existing roster and leader-only request tools. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CrownIcon, DoorOpenIcon, SettingsIcon } from "lucide-react";
import { toast } from "@/lib/toast";
import { NavigationButton } from "@/components/shared/navigation-button";
import { LoadingButton } from "@/components/shared/loading-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leaveFellowshipAction } from "../actions/leave-fellowship.action";
import { FellowshipInsignia } from "./fellowship-insignia";
import { FellowshipInvitePanel } from "./fellowship-invite-panel";
import { FellowshipJoinRequestManager } from "./fellowship-join-request-manager";
import { FellowshipGovernancePanel } from "./fellowship-governance-panel";
import { FellowshipMemberList } from "./fellowship-member-list";
import { FellowshipOverview } from "./fellowship-overview";
import { FellowshipInfoPanel } from "./fellowship-info-panel";
import { GamePageColumns } from "@/components/shared/game-page-columns";
import { getFellowshipInsignia } from "../constants/fellowship-insignias";
import type { FellowshipDetailData } from "../types/fellowship.types";
import styles from "./fellowship-detail.module.css";

/**
 * Overview remains the default even with pending requests; their count makes
 * reviews visible. Only eligible leaders see Manage/Invite, and only ordinary
 * members can leave. All mutations retain their server-side checks.
 */
export function FellowshipDetail({
  fellowship,
}: {
  fellowship: FellowshipDetailData;
}): React.ReactNode {
  const t = useTranslations("Fellowships");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("overview");
  const pendingRequestCount = fellowship.joinRequests.filter(
    (request) => request.status === "PENDING",
  ).length;
  const canReviewRequests = fellowship.isLeader && !fellowship.isSuspended;
  const canManage = fellowship.isLeader && !fellowship.isClosing && !fellowship.isSuspended;

  /** Leave only after the authorized server action commits, then refresh the directory. */
  const leave = (): void => {
    startTransition(async () => {
      const result = await leaveFellowshipAction({ fellowshipId: fellowship.id });
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
    <GamePageColumns
      contextPanel={<FellowshipInfoPanel fellowship={fellowship} />}
    >
      <header className={styles.hero}>
        <div className={styles.identity}>
          <FellowshipInsignia
            insigniaKey={fellowship.insigniaKey}
            label={t(getFellowshipInsignia(fellowship.insigniaKey).labelKey)}
            className="size-20 rounded-2xl sm:size-24"
          />
          <div className={styles.identityCopy}>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{fellowship.name}</h1>
              {fellowship.isLeader && (
                <span className={styles.badge} data-role="leader">
                  <CrownIcon className="size-3.5" aria-hidden="true" />
                  {t("leader")}
                </span>
              )}
            </div>
            <div className={styles.badges}>
              <span className={styles.badge} data-access={fellowship.isPublic ? "open" : "private"}>
                {t(fellowship.isPublic ? "overview.openFellowship" : "private")}
              </span>
              <span className={styles.badge}>
                {t("members", { count: fellowship.memberCount })}
              </span>
            </div>
          </div>
        </div>
        <p className={styles.introduction}>
          {fellowship.introduction || t("overview.introductionFallback")}
        </p>
        {(canManage || (fellowship.isMember && !fellowship.isLeader)) && (
          <div className={styles.actions}>
            {canManage && (
              <NavigationButton
                href={`/fellowships/${fellowship.slug}/edit`}
                pendingLabel={t("openingSettings")}
              >
                <SettingsIcon aria-hidden="true" />
                {t("manage")}
              </NavigationButton>
            )}
            {canManage && fellowship.inviteCode && (
              <FellowshipInvitePanel
                fellowshipId={fellowship.id}
                fellowshipName={fellowship.name}
                initialInviteCode={fellowship.inviteCode}
              />
            )}
            {fellowship.isMember && !fellowship.isLeader && (
              <LoadingButton
                variant="destructive"
                disabled={isPending}
                isPending={isPending}
                pendingLabel={t("saving")}
                onClick={leave}
              >
                <DoorOpenIcon aria-hidden="true" />
                {t("leave")}
              </LoadingButton>
            )}
          </div>
        )}
      </header>

      <FellowshipGovernancePanel
        fellowshipId={fellowship.id}
        fellowshipName={fellowship.name}
        isLeader={fellowship.isLeader}
        governance={fellowship.governance}
      />

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(String(value))}
        className={styles.tabs}
      >
        <TabsList className={styles.tabList} data-requests={canReviewRequests}>
          <TabsTrigger value="overview">{t("overview.tab")}</TabsTrigger>
          <TabsTrigger value="members">{t("membersTab")}</TabsTrigger>
          {canReviewRequests && (
            <TabsTrigger value="requests">
              {t("requestsTab")}
              {pendingRequestCount > 0 && (
                <span className={styles.requestCount}>{pendingRequestCount}</span>
              )}
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="overview">
          <FellowshipOverview fellowship={fellowship} />
        </TabsContent>
        <TabsContent value="members">
          <FellowshipMemberList members={fellowship.members} />
        </TabsContent>
        {canReviewRequests && (
          <TabsContent value="requests">
            <FellowshipJoinRequestManager requests={fellowship.joinRequests} />
          </TabsContent>
        )}
      </Tabs>
    </GamePageColumns>
  );
}
