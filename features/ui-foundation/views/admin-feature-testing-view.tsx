import type { Metadata } from "next";

import { FellowshipTestPreview } from "@/features/fellowships/components/fellowship-test-preview";
import { NotificationTestPreview } from "@/features/notifications/components/notification-test-preview";
import { OilShopPurchasePreview } from "@/features/ui-foundation/components/oil-shop-purchase-preview";
import { OilShopTestPreview } from "@/features/oil-shop/components/oil-shop-test-preview";
import { SanctuaryContentsNavigation, SanctuaryStudyContent } from "@/features/sanctuary/components/sanctuary-study-content";
import { SanctuaryTestPreview } from "@/features/sanctuary/components/sanctuary-test-preview";
import { SANCTUARY_TEST_DATA } from "@/features/sanctuary/data/sanctuary-test-data";
import { SettingsTestPreview } from "@/features/settings/components/settings-test-preview";
import { VaultCardTestPreview } from "@/features/vault/components/vault-card-test-preview";
import { AdminTestingShell } from "@/features/ui-foundation/components/admin-testing-shell";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Feature testing | Scripture Memo",
  description: "Run prepared, isolated checks for Scripture Memo features.",
  robots: { index: false, follow: false },
};

/** Groups in-memory feature acceptance scenarios on one administrator page. */
export async function AdminFeatureTestingView(): Promise<React.ReactNode> {
  await getAdminSession();

  return (
    <AdminTestingShell
      activePath="/admin/testing/features"
      title="Feature checks"
      description="Run the existing isolated feature scenarios from one place. These previews reuse production components and sample data."
    >
      <div id="feature-test-previews" className="scroll-mt-24 space-y-6">
        <NotificationTestPreview />
        <VaultCardTestPreview />
        <FellowshipTestPreview />
        <OilShopTestPreview />
        <OilShopPurchasePreview />
        <SettingsTestPreview />
        <SanctuaryTestPreview
          studyContent={<SanctuaryStudyContent data={SANCTUARY_TEST_DATA} />}
          contentsNavigation={
            <SanctuaryContentsNavigation data={SANCTUARY_TEST_DATA} />
          }
        />
      </div>
    </AdminTestingShell>
  );
}
