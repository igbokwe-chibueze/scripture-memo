import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { ResponsiveContainer } from "@/components/shared/responsive-container";
import { VerseForm } from "@/features/verses/components/verse-form";
import { getVerseEditData } from "@/features/verses/lib/get-verse-edit-data";

export const metadata: Metadata = { title: "Edit verse | Scripture Memo", robots: { index: false, follow: false } };

/** ADMIN-only edit composition for an existing verse. */
export async function EditVerseView({ params }: { params: Promise<{ id: string }> }): Promise<React.ReactNode> {
  const verse = await getVerseEditData((await params).id);
  if (!verse) notFound();
  const text = Object.fromEntries(verse.translations.map((item) => [item.translation, item.text]));

  return (
    <main className="min-h-svh bg-muted/20 py-8">
      <ResponsiveContainer size="md" className="space-y-6">
        <PageHeader eyebrow="Scripture library" title={`Edit ${verse.reference}`} description="Changes affect future practice sessions using this verse." />
        <VerseForm
          mode="edit"
          initialValues={{
            id: verse.id,
            book: verse.book,
            chapter: verse.chapter,
            verseStart: verse.verseStart,
            verseEnd: verse.verseEnd ?? "",
            reflection: verse.reflection ?? "",
            studyNote: verse.studyNote ?? "",
            tags: verse.tags.map(({ tag }) => tag.name).join(", "),
            isActive: verse.isActive,
            translations: { NIV: text.NIV ?? "", ESV: text.ESV ?? "", KJV: text.KJV ?? "" },
          }}
        />
      </ResponsiveContainer>
    </main>
  );
}
