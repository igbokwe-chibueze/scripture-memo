import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { PackForm } from "@/features/packs/components/pack-form";

export const metadata: Metadata = { title: "Create pack | Scripture Memo", robots: { index: false, follow: false } };

/** ADMIN-only hidden-pack creation view. */
export async function CreatePackView(): Promise<React.ReactNode> {
  await getAdminSession();
  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="md" className="space-y-6">
        <PageHeader eyebrow="Learning packs" title="Create a themed pack" description="New packs remain hidden until you add and order at least one published verse." />
        <Card>
          <CardHeader><CardTitle>Pack details</CardTitle></CardHeader>
          <CardContent><PackForm mode="create" initialValues={{ name: "", description: "" }} /></CardContent>
        </Card>
      </ResponsiveContainer>
    </main>
  );
}
