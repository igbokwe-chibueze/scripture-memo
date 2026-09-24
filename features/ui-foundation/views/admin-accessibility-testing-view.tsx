import type { Metadata } from "next";

import { MotionPreferencePreview } from "@/features/ui-foundation/components/motion-preference-preview";
import { AdminTestingShell } from "@/features/ui-foundation/components/admin-testing-shell";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";

export const metadata: Metadata = {
  title: "Accessibility testing | Scripture Memo",
  description: "Check operating-system and saved reduced-motion preferences.",
  robots: { index: false, follow: false },
};

/** Provides focused access to cross-feature motion and accessibility checks. */
export async function AdminAccessibilityTestingView(): Promise<React.ReactNode> {
  await getAdminSession();

  return (
    <AdminTestingShell
      activePath="/admin/testing/accessibility"
      title="Accessibility checks"
      description="Confirm that the interface respects both device accessibility preferences and Scripture Memo settings."
    >
      <MotionPreferencePreview />
    </AdminTestingShell>
  );
}
