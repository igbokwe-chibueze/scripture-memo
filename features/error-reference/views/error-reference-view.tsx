import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { ErrorReferenceList } from "@/features/error-reference/components/error-reference-list";
import { ERROR_CATALOG } from "@/lib/errors/error-catalog";

export const metadata: Metadata = {
  title: "Error reference | Scripture Memo",
  description: "Administrator reference for Scripture Memo operational error codes.",
  robots: { index: false, follow: false },
};

/** ADMIN-only operational guide generated from the application error catalogue. */
export async function ErrorReferenceView(): Promise<React.ReactNode> {
  // WHY: Proxy improves navigation UX but is not the authorization boundary.
  // The server view verifies ADMIN access before serializing catalogue entries.
  await getAdminSession();

  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="xl" className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="Error reference"
          description="Look up application-wide error codes, understand why they occur, and follow safe troubleshooting guidance. Codes describe conditions rather than individual incidents."
        />
        <ErrorReferenceList entries={ERROR_CATALOG} />
      </ResponsiveContainer>
    </main>
  );
}
