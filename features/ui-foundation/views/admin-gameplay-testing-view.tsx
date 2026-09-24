import type { Metadata } from "next";

import { BadgeUnlockPreview } from "@/features/ui-foundation/components/badge-unlock-preview";
import { LeagueResultPreview } from "@/features/ui-foundation/components/league-result-preview";
import { ModeCompletionPreview } from "@/features/ui-foundation/components/mode-completion-preview";
import { StreakCompletionPreview } from "@/features/ui-foundation/components/streak-completion-preview";
import { WaypointCompletionPreview } from "@/features/ui-foundation/components/waypoint-completion-preview";
import { GameplayTestPreview } from "@/features/gameplay";
import { DaySelectionTestPreview } from "@/features/waypoints";
import { AdminTestingShell } from "@/features/ui-foundation/components/admin-testing-shell";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Gameplay testing | Scripture Memo",
  description: "Review gameplay and reward previews with sample data.",
  robots: { index: false, follow: false },
};

/** Keeps game progression previews together without requiring a live playthrough. */
export async function AdminGameplayTestingView(): Promise<React.ReactNode> {
  await getAdminSession();

  return (
    <AdminTestingShell
      activePath="/admin/testing/gameplay"
      title="Gameplay and rewards"
      description="Review challenge states and reward celebrations with prepared sample scenarios. No real challenge progress is required."
    >
      <section id="gameplay-test-previews" className="scroll-mt-24 space-y-6">
        <DaySelectionTestPreview />
        <GameplayTestPreview />
      </section>
      <section id="reward-test-previews" className="scroll-mt-24 space-y-6">
        <h2 className="font-heading text-2xl font-black">Completion and reward previews</h2>
        <ModeCompletionPreview />
        <WaypointCompletionPreview />
        <StreakCompletionPreview />
        <BadgeUnlockPreview />
        <LeagueResultPreview />
      </section>
    </AdminTestingShell>
  );
}
