import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { getAdminSession } from "@/features/auth/lib/get-admin-session";
import { VerseForm } from "@/features/verses/components/verse-form";

export const metadata: Metadata = { title: "Create verse | Scripture Memo", robots: { index: false, follow: false } };

/** ADMIN-only create composition with safe unpublished defaults. */
export async function CreateVerseView(): Promise<React.ReactNode> {
  await getAdminSession();
  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="md" className="space-y-6">
        <PageHeader eyebrow="Scripture library" title="Create verse" description="Add the reference, study content, tags, and all three translations." />
        <VerseForm mode="create" initialValues={{ reference: "", book: "", chapter: 1, verseStart: 1, verseEnd: "", reflection: "", studyNote: "", tags: "", isActive: false, translations: { NIV: "", ESV: "", KJV: "" } }} />
      </ResponsiveContainer>
    </main>
  );
}
