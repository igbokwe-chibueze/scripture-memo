import type { Metadata } from "next";
import { MapIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { ErrorScreenPreview } from "@/features/ui-foundation/components/error-screen-preview";
import { FoundationControls } from "@/features/ui-foundation/components/foundation-controls";
import { FoundationTable } from "@/features/ui-foundation/components/foundation-table";
import { GameButtonShowcase } from "@/features/ui-foundation/components/game-button-showcase";
import { LoadingScreenPreview } from "@/features/ui-foundation/components/loading-screen-preview";
import { LunaMascotPreview } from "@/features/ui-foundation/components/luna-mascot-preview";
import { TypographyBalancePreview } from "@/features/ui-foundation/components/typography-balance-preview";
import { WaypointButtonShowcase } from "@/features/ui-foundation/components/waypoint-button-showcase";
import { AdminTestingShell } from "@/features/ui-foundation/components/admin-testing-shell";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Shared UI testing | Scripture Memo",
  description: "Review shared Scripture Memo controls and game buttons.",
  robots: { index: false, follow: false },
};

/** Composes shared controls and visual primitives used across player screens. */
export async function AdminSharedUiTestingView(): Promise<React.ReactNode> {
  await getAdminSession();

  return (
    <AdminTestingShell
      activePath="/admin/testing/shared-ui"
      title="Shared UI"
      description="Review the production controls and common visual building blocks used across the game."
    >
      <GameButtonShowcase />
      <TypographyBalancePreview />
      <WaypointButtonShowcase />
      <FoundationControls />
      <FoundationTable />
      <LunaMascotPreview />
      <LoadingScreenPreview />
      <ErrorScreenPreview />
      <EmptyState
        icon={<MapIcon />}
        title="Your journey is ready to begin"
        description="Your published waypoints will appear here when your journey opens."
      />
    </AdminTestingShell>
  );
}
